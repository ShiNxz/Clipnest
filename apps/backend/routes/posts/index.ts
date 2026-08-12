import { desc, eq, sql } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { db } from '../../db'
import { posts } from '../../db/schema'
import isAuth from '../../middlewares/isAuth'
import { POSTS_PREFIX, kindFromMime } from '../../utils/constants/Files'
import { logError } from '../../utils/lib/console'
import { publicUrl } from '../../utils/lib/r2'
import { forgetFiles } from '../../utils/lib/r2/cleanup'
import { headObject } from '../../utils/lib/r2/get'
import { authorColumns } from '../../utils/lib/serialize'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 60

/**
 * The feed cursor is `<createdAt ISO>|<id>`, not just a timestamp.
 *
 * Two posts can land on the same millisecond — a bulk upload does it easily —
 * and a timestamp-only `createdAt < cursor` then skips every post that shares
 * the boundary instant. Pairing it with the id gives a total order, and
 * Postgres compares the pair natively with row-value syntax.
 */
const encodeCursor = (post: { createdAt: Date; id: string }) => `${post.createdAt.toISOString()}|${post.id}`

const decodeCursor = (cursor: string) => {
	const separator = cursor.lastIndexOf('|')
	if (separator === -1) return null

	const createdAt = new Date(cursor.slice(0, separator))
	const id = cursor.slice(separator + 1)
	if (Number.isNaN(createdAt.getTime()) || !id) return null

	return { createdAt, id }
}

const PostRoutes = new Elysia({
	detail: {
		tags: ['Posts'],
	},
})
	.use(isAuth)
	.get(
		'/',
		async ({ query: { limit, before }, error }) => {
			try {
				const take = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
				const cursor = before ? decodeCursor(before) : null

				// Keyset pagination — an offset would shuffle items under the reader
				// every time someone posts while they're scrolling.
				const items = await db.query.posts.findMany({
					where: cursor
						? sql`(${posts.createdAt}, ${posts.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
						: undefined,
					orderBy: [desc(posts.createdAt), desc(posts.id)],
					limit: take + 1,
					with: { author: { columns: authorColumns } },
				})

				const hasMore = items.length > take
				const page = hasMore ? items.slice(0, take) : items
				const last = page[page.length - 1]

				return {
					items: page,
					// Null means "end of feed" — the client stops asking.
					nextCursor: hasMore && last ? encodeCursor(last) : null,
				}
			} catch (err) {
				logError(err)
				return error(500, 'Failed to load the feed')
			}
		},
		{
			detail: { summary: 'The feed, newest first' },
			query: t.Object({
				limit: t.Optional(t.Numeric()),
				before: t.Optional(t.String()),
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

				return created
			} catch (err) {
				logError(err)
				return error(500, 'Failed to create the post')
			}
		},
		{
			detail: { summary: 'Publish an already-uploaded file to the feed' },
			body: t.Object({
				key: t.String(),
				caption: t.Optional(t.String({ maxLength: 2000 })),
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

export default PostRoutes
