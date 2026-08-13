import { and, eq, isNotNull, sql } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { db } from '../../db'
import { comments, postLikes, posts, users } from '../../db/schema'
import { logError } from '../../utils/lib/console'
import { publicPost } from '../../utils/lib/serialize'

/**
 * The one unauthenticated corner of the API.
 *
 * Everything else hangs off `isAuth`; this group deliberately doesn't, so it
 * lives in its own file and its own namespace rather than as an exception
 * tucked inside the post routes. Anything added here is public — that's the
 * point of the URL prefix, and the only thing to check when reviewing it.
 *
 * The single route below answers for exactly one post, by id, and only once
 * somebody in the group has explicitly shared it. There is no list, no
 * neighbours, no search: an outsider holding one link learns about one post.
 */
const PublicRoutes = new Elysia({
	detail: {
		tags: ['Public'],
	},
}).get(
	'/posts/:id',
	async ({ params: { id }, error }) => {
		try {
			const [row] = await db
				.select({
					id: posts.id,
					caption: posts.caption,
					kind: posts.kind,
					key: posts.key,
					mime: posts.mime,
					width: posts.width,
					height: posts.height,
					duration: posts.duration,
					createdAt: posts.createdAt,
					sharedAt: posts.sharedAt,
					author: { name: users.name, avatarUrl: users.avatarUrl },
					likeCount: sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${posts.id})`,
					commentCount: sql<number>`(select count(*)::int from ${comments} where ${comments.postId} = ${posts.id})`,
				})
				.from(posts)
				.innerJoin(users, eq(users.id, posts.authorId))
				// The share flag is part of the lookup, not a check after it — there's
				// no branch here that can be got wrong later, and no version of this
				// query that returns an unshared post.
				.where(and(eq(posts.id, id), isNotNull(posts.sharedAt)))
				.limit(1)

			// The same 404 for a post that doesn't exist, one that was never shared,
			// and one that was shared and then taken back. Anything more specific
			// would confirm which posts exist to someone guessing at ids.
			if (!row) return error(404, 'This post is private or no longer shared')

			return publicPost(row)
		} catch (err) {
			logError(err)
			return error(500, 'Failed to load the post')
		}
	},
	{
		detail: {
			summary: 'One shared post — no session needed',
			description:
				'Answers only for a post someone has explicitly shared, and only with what a stranger may see: the media, the caption, the author’s name and avatar, and bare like and comment tallies. Every other post on the site 404s here.',
		},
		// Nothing that isn't shaped like an id reaches the query: `uuid = 'abc'` is
		// a cast error in Postgres, which would come back as a 500 for what is
		// really just a mistyped link.
		params: t.Object({ id: t.String({ format: 'uuid' }) }),
	},
)

export default PublicRoutes
