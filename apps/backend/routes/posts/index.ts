import { type SQL, and, asc, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { DEFAULT_FEED_SORT, FEED_SORTS, type FeedSort, POST_CAPTION_MAX_LENGTH, byTopComments } from 'shared'
import { db } from '../../db'
import { commentLikes, comments, postLikes, posts, users } from '../../db/schema'
import isAuth from '../../middlewares/isAuth'
import { POSTS_PREFIX, kindFromMime } from '../../utils/constants/Files'
import { logError } from '../../utils/lib/console'
import { publicUrl } from '../../utils/lib/r2'
import { forgetFiles } from '../../utils/lib/r2/cleanup'
import { headObject } from '../../utils/lib/r2/get'
import { authorColumns } from '../../utils/lib/serialize'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 60

/** How many likers travel with a post — enough to fill the hover card. */
const LIKERS_PREVIEW = 12

const MAX_COMMENT_LENGTH = 1000

/**
 * A post's tallies, counted by the feed query itself.
 *
 * `withSocial` counts the same things a moment later from the rows it fetches,
 * so these exist only for the sorts that *order* by them — and for the cursor,
 * which has to carry the value the previous page stopped on. Correlated
 * subqueries rather than grouped joins: both sides are indexed by post id, and
 * it keeps the page query a plain select over `posts` no matter the sort.
 */
const likeCount = sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${posts.id})`

const commentCount = sql<number>`(select count(*)::int from ${comments} where ${comments.postId} = ${posts.id})`

/** What each sort ranks by, before the tie-break every sort shares. */
const SORT_RANKS = {
	recent: null,
	oldest: null,
	liked: { column: likeCount, valueOf: (post: Ranked) => post.likeCount },
	commented: { column: commentCount, valueOf: (post: Ranked) => post.commentCount },
} satisfies Record<FeedSort, { column: SQL<number>; valueOf: (post: Ranked) => number } | null>

type Ranked = { createdAt: Date; id: string; likeCount: number; commentCount: number }

/**
 * The cursor is the tuple its sort walks, not just a timestamp.
 *
 * Two posts can land on the same millisecond — a bulk upload does it easily —
 * and a `createdAt < cursor` alone then skips every post sharing the boundary
 * instant. Ranked sorts collide far harder: a hundred posts can all have two
 * likes. So `createdAt, id` trails every sort, which makes the order total, and
 * the cursor carries each value in it. Postgres compares the whole tuple
 * natively with row-value syntax.
 */
const encodeCursor = (sort: FeedSort, post: Ranked) => {
	const rank = SORT_RANKS[sort]
	const tail = `${post.createdAt.toISOString()}|${post.id}`

	return rank ? `${rank.valueOf(post)}|${tail}` : tail
}

// Neither an ISO timestamp nor a uuid can contain the separator, so splitting
// on it is unambiguous.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const decodeCursor = (sort: FeedSort, cursor: string) => {
	const ranked = Boolean(SORT_RANKS[sort])
	const parts = cursor.split('|')
	if (parts.length !== (ranked ? 3 : 2)) return null

	// A cursor is only ever read back under the sort that wrote it; anything
	// else is a hand-edited query string, and `null` sends it to the top of the
	// feed rather than into a cast error.
	const rank = ranked ? Number(parts[0]) : 0
	const createdAt = new Date(parts.at(-2)!)
	const id = parts.at(-1)!

	if (!Number.isInteger(rank) || Number.isNaN(createdAt.getTime()) || !UUID.test(id)) return null

	return { rank, createdAt, id }
}

type Cursor = NonNullable<ReturnType<typeof decodeCursor>>

/** Everything the previous page stopped short of, in this sort's own order. */
const after = (sort: FeedSort, cursor: Cursor) => {
	const rank = SORT_RANKS[sort]
	const boundary = sql`${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid`

	if (rank) return sql`(${rank.column}, ${posts.createdAt}, ${posts.id}) < (${cursor.rank}::int, ${boundary})`

	return sort === 'oldest'
		? sql`(${posts.createdAt}, ${posts.id}) > (${boundary})`
		: sql`(${posts.createdAt}, ${posts.id}) < (${boundary})`
}

/** Descending everywhere except `oldest`, which is the same walk turned around. */
const orderBy = (sort: FeedSort): SQL[] => {
	const rank = SORT_RANKS[sort]
	if (rank) return [desc(rank.column), desc(posts.createdAt), desc(posts.id)]

	return sort === 'oldest' ? [asc(posts.createdAt), asc(posts.id)] : [desc(posts.createdAt), desc(posts.id)]
}

/**
 * Every like on the given posts, newest first, with the liker attached.
 *
 * The whole set rather than a count plus a preview: this is a feed for one
 * group of friends, so "every like on a page of twelve posts" is a few hundred
 * rows at the absolute worst — cheaper than the window function it would take
 * to fetch a top-N per post, and it answers all three questions at once (how
 * many, did I, and who).
 */
const likeRowsFor = (postIds: string[]) =>
	db
		.select({
			postId: postLikes.postId,
			userId: postLikes.userId,
			name: users.name,
			avatarUrl: users.avatarUrl,
		})
		.from(postLikes)
		.innerJoin(users, eq(users.id, postLikes.userId))
		.where(inArray(postLikes.postId, postIds))
		.orderBy(desc(postLikes.createdAt))

type LikeRow = Awaited<ReturnType<typeof likeRowsFor>>[number]

/** The like blob the client renders: the count, the heart's state, the faces. */
const summarizeLikes = (rows: LikeRow[], viewerId: string) => ({
	likeCount: rows.length,
	likedByMe: rows.some(row => row.userId === viewerId),
	// Capped: the hover card shows a handful and says "and N others".
	likers: rows.slice(0, LIKERS_PREVIEW).map(row => ({
		id: row.userId,
		name: row.name,
		avatarUrl: row.avatarUrl,
	})),
})

/** Every comment on the given posts; `byTopComments` puts them in reading order. */
const commentRowsFor = (postIds: string[]) =>
	db.query.comments.findMany({
		where: inArray(comments.postId, postIds),
		orderBy: [asc(comments.createdAt)],
		with: { author: { columns: authorColumns } },
	})

/** The same three questions as `likeRowsFor`, one level down. */
const commentLikeRowsFor = (commentIds: string[]) =>
	db
		.select({
			commentId: commentLikes.commentId,
			userId: commentLikes.userId,
			name: users.name,
			avatarUrl: users.avatarUrl,
		})
		.from(commentLikes)
		.innerJoin(users, eq(users.id, commentLikes.userId))
		.where(inArray(commentLikes.commentId, commentIds))
		.orderBy(desc(commentLikes.createdAt))

type CommentLikeRow = Awaited<ReturnType<typeof commentLikeRowsFor>>[number]

const summarizeCommentLikes = (rows: CommentLikeRow[], viewerId: string) => ({
	likeCount: rows.length,
	likedByMe: rows.some(row => row.userId === viewerId),
	likers: rows.slice(0, LIKERS_PREVIEW).map(row => ({
		id: row.userId,
		name: row.name,
		avatarUrl: row.avatarUrl,
	})),
})

/** An empty thread: what a comment looks like the moment it's written. */
const NO_LIKES = { likeCount: 0, likedByMe: false, likers: [] as { id: string; name: string; avatarUrl: string }[] }

type CommentRow = Awaited<ReturnType<typeof commentRowsFor>>[number] & typeof NO_LIKES

/** Group rows under a key, keeping the order they came back in. */
const groupBy = <T>(rows: T[], keyOf: (row: T) => string) => {
	const grouped = new Map<string, T[]>()

	for (const row of rows) {
		const bucket = grouped.get(keyOf(row))
		if (bucket) bucket.push(row)
		else grouped.set(keyOf(row), [row])
	}

	return grouped
}

/**
 * Likes and comments (and the likes on those) for a page of posts — three
 * queries, not three per post.
 *
 * The threads ride along with the feed rather than being fetched per card,
 * because every card shows its thread: twelve extra round trips on every scroll
 * would cost far more than the few kilobytes this adds.
 */
const withSocial = async <T extends { id: string }>(page: T[], viewerId: string) => {
	const postIds = page.map(post => post.id)

	const [likes, thread] = postIds.length
		? await Promise.all([likeRowsFor(postIds), commentRowsFor(postIds)])
		: [[] as LikeRow[], [] as Awaited<ReturnType<typeof commentRowsFor>>]

	// Only asked once the comments are known — there's nothing to look up until
	// there are ids to look up by.
	const commentLikeRows = thread.length ? await commentLikeRowsFor(thread.map(comment => comment.id)) : []

	const likesByPost = groupBy(likes, row => row.postId)
	const commentsByPost = groupBy(thread, row => row.postId)
	const likesByComment = groupBy(commentLikeRows, row => row.commentId)

	return page.map(post => {
		// Sorted here rather than in the query: the tally each comment is ranked
		// by is counted in `summarizeCommentLikes`, not by the database.
		const comments: CommentRow[] = (commentsByPost.get(post.id) ?? [])
			.map(comment => ({
				...comment,
				...summarizeCommentLikes(likesByComment.get(comment.id) ?? [], viewerId),
			}))
			.sort(byTopComments)

		return {
			...post,
			...summarizeLikes(likesByPost.get(post.id) ?? [], viewerId),
			comments,
			commentCount: comments.length,
		}
	})
}

const PostRoutes = new Elysia({
	detail: {
		tags: ['Posts'],
	},
})
	.use(isAuth)
	.get(
		'/',
		async ({ query: { limit, before, sort }, user, error }) => {
			try {
				const take = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
				const order = sort ?? DEFAULT_FEED_SORT
				const cursor = before ? decodeCursor(order, before) : null

				// Keyset pagination — an offset would shuffle items under the reader
				// every time someone posts while they're scrolling.
				const items = await db
					.select({
						...getTableColumns(posts),
						author: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
						likeCount,
						commentCount,
					})
					.from(posts)
					.innerJoin(users, eq(users.id, posts.authorId))
					.where(cursor ? after(order, cursor) : undefined)
					.orderBy(...orderBy(order))
					.limit(take + 1)

				const hasMore = items.length > take
				const page = hasMore ? items.slice(0, take) : items
				const last = page[page.length - 1]

				return {
					items: await withSocial(page, user.id),
					// Null means "end of feed" — the client stops asking.
					nextCursor: hasMore && last ? encodeCursor(order, last) : null,
				}
			} catch (err) {
				logError(err)
				return error(500, 'Failed to load the feed')
			}
		},
		{
			detail: { summary: 'The feed, one page at a time, in any of the supported orders' },
			query: t.Object({
				limit: t.Optional(t.Numeric()),
				before: t.Optional(t.String()),
				// Straight off the shared list, so an order added there is accepted
				// here — and anything else is a 422 rather than a silent default.
				sort: t.Optional(t.UnionEnum(FEED_SORTS)),
			}),
		},
	)
	.post(
		'/',
		async ({ body: { key, caption, width, height, duration }, user, error }) => {
			try {
				// The uploader's own prefix — otherwise anyone could publish a post
				// pointing at someone else's freshly uploaded key.
				if (!key.startsWith(`${POSTS_PREFIX}${user.id}/`)) return error(403, 'That upload is not yours')

				// Confirms the PUT actually landed, and gives us the real size and
				// content type rather than whatever the client claims.
				const head = await headObject(key)
				if (!head) return error(404, 'Upload not found — the file never finished uploading')

				const mime = head.contentType || 'application/octet-stream'
				const kind = kindFromMime(mime)
				if (!kind) return error(415, 'Only images and videos can be posted')

				const [created] = await db
					.insert(posts)
					.values({
						authorId: user.id,
						caption: caption?.trim() ?? '',
						kind,
						key,
						url: publicUrl(key),
						mime,
						size: head.size,
						width: width ?? null,
						height: height ?? null,
						duration: kind === 'video' ? (duration ?? null) : null,
					})
					.returning()

				// Shaped like a feed item so the client can drop it straight into the
				// feed it already has, instead of re-reading the whole page.
				return {
					...created,
					author: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
					likeCount: 0,
					likedByMe: false,
					likers: [] as { id: string; name: string; avatarUrl: string }[],
					comments: [] as CommentRow[],
					commentCount: 0,
				}
			} catch (err) {
				logError(err)
				return error(500, 'Failed to create the post')
			}
		},
		{
			detail: { summary: 'Publish an already-uploaded file to the feed' },
			body: t.Object({
				key: t.String(),
				caption: t.Optional(t.String({ maxLength: POST_CAPTION_MAX_LENGTH })),
				width: t.Optional(t.Number()),
				height: t.Optional(t.Number()),
				duration: t.Optional(t.Number()),
			}),
		},
	)
	.delete(
		'/:id',
		async ({ params: { id }, user, error }) => {
			try {
				const post = await db.query.posts.findFirst({ where: eq(posts.id, id) })
				if (!post) return error(404, 'Post not found')

				if (post.authorId !== user.id && !user.isAdmin) return error(403, 'Not your post')

				await db.delete(posts).where(eq(posts.id, id))
				await forgetFiles([post.key])

				return true
			} catch (err) {
				logError(err)
				return error(500, 'Failed to delete the post')
			}
		},
		{
			detail: { summary: 'Delete your own post (admins can delete any)' },
			params: t.Object({
				id: t.String(),
			}),
		},
	)

	// ---------------------------------------------------------------- likes
	.post(
		'/:id/like',
		async ({ params: { id }, user, error }) => {
			try {
				const post = await db.query.posts.findFirst({ where: eq(posts.id, id), columns: { id: true } })
				if (!post) return error(404, 'Post not found')

				// Idempotent: the primary key already says one like per person, so a
				// double-click is a no-op rather than a duplicate-key error.
				await db.insert(postLikes).values({ postId: id, userId: user.id }).onConflictDoNothing()

				return summarizeLikes(await likeRowsFor([id]), user.id)
			} catch (err) {
				logError(err)
				return error(500, 'Failed to like the post')
			}
		},
		{
			detail: { summary: 'Like a post' },
			params: t.Object({ id: t.String() }),
		},
	)
	.delete(
		'/:id/like',
		async ({ params: { id }, user, error }) => {
			try {
				await db.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, user.id)))

				return summarizeLikes(await likeRowsFor([id]), user.id)
			} catch (err) {
				logError(err)
				return error(500, 'Failed to unlike the post')
			}
		},
		{
			detail: { summary: 'Take your like back' },
			params: t.Object({ id: t.String() }),
		},
	)

	// ------------------------------------------------------------- comments
	.post(
		'/:id/comments',
		async ({ params: { id }, body: { body }, user, error }) => {
			try {
				const text = body.trim()
				if (!text) return error(400, 'Say something first')

				const post = await db.query.posts.findFirst({ where: eq(posts.id, id), columns: { id: true } })
				if (!post) return error(404, 'Post not found')

				const [created] = await db.insert(comments).values({ postId: id, authorId: user.id, body: text }).returning()

				// Shaped like a comment from the feed — author attached, likes empty —
				// so the client can push it straight into the thread it's showing.
				return {
					...created,
					author: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
					...NO_LIKES,
				}
			} catch (err) {
				logError(err)
				return error(500, 'Failed to post the comment')
			}
		},
		{
			detail: { summary: 'Comment on a post' },
			params: t.Object({ id: t.String() }),
			body: t.Object({
				body: t.String({ minLength: 1, maxLength: MAX_COMMENT_LENGTH }),
			}),
		},
	)
	.post(
		'/:id/comments/:commentId/like',
		async ({ params: { id, commentId }, user, error }) => {
			try {
				const comment = await db.query.comments.findFirst({
					where: and(eq(comments.id, commentId), eq(comments.postId, id)),
					columns: { id: true },
				})
				if (!comment) return error(404, 'Comment not found')

				await db.insert(commentLikes).values({ commentId, userId: user.id }).onConflictDoNothing()

				return summarizeCommentLikes(await commentLikeRowsFor([commentId]), user.id)
			} catch (err) {
				logError(err)
				return error(500, 'Failed to like the comment')
			}
		},
		{
			detail: { summary: 'Like a comment' },
			params: t.Object({ id: t.String(), commentId: t.String() }),
		},
	)
	.delete(
		'/:id/comments/:commentId/like',
		async ({ params: { commentId }, user, error }) => {
			try {
				await db
					.delete(commentLikes)
					.where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, user.id)))

				return summarizeCommentLikes(await commentLikeRowsFor([commentId]), user.id)
			} catch (err) {
				logError(err)
				return error(500, 'Failed to unlike the comment')
			}
		},
		{
			detail: { summary: 'Take your like off a comment' },
			params: t.Object({ id: t.String(), commentId: t.String() }),
		},
	)
	.delete(
		'/:id/comments/:commentId',
		async ({ params: { id, commentId }, user, error }) => {
			try {
				const comment = await db.query.comments.findFirst({
					where: and(eq(comments.id, commentId), eq(comments.postId, id)),
					with: { post: { columns: { authorId: true } } },
				})
				if (!comment) return error(404, 'Comment not found')

				// Your own comment, anything under your own post, or you're an admin.
				const mayDelete = comment.authorId === user.id || comment.post.authorId === user.id || user.isAdmin
				if (!mayDelete) return error(403, 'Not your comment')

				await db.delete(comments).where(eq(comments.id, commentId))

				return true
			} catch (err) {
				logError(err)
				return error(500, 'Failed to delete the comment')
			}
		},
		{
			detail: { summary: 'Delete a comment (yours, or any on your own post)' },
			params: t.Object({ id: t.String(), commentId: t.String() }),
		},
	)

export default PostRoutes
