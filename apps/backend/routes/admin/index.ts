import { asc, count, desc, eq } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { DEFAULT_AVATAR_STYLE, avatarUrl, randomSeed } from 'shared'
import { db } from '../../db'
import { posts, users } from '../../db/schema'
import isAdmin from '../../middlewares/isAdmin'
import { logError } from '../../utils/lib/console'
import { hashPassword } from '../../utils/lib/password'
import { forgetFiles } from '../../utils/lib/r2/cleanup'
import { authorColumns } from '../../utils/lib/serialize'

/** Folded form used for the case-insensitive uniqueness of display names. */
const nameKeyOf = (name: string) => name.trim().toLowerCase()

const AdminRoutes = new Elysia({
	detail: {
		tags: ['Admin'],
	},
})
	.use(isAdmin)

	// ---------------------------------------------------------------- clips
	.get(
		'/posts',
		async ({ error }) => {
			try {
				return await db.query.posts.findMany({
					orderBy: [desc(posts.createdAt)],
					with: { author: { columns: authorColumns } },
				})
			} catch (err) {
				logError(err)
				return error(500, 'Failed to load posts')
			}
		},
		{
			detail: { summary: 'Every clip and image on the site' },
		},
	)
	.delete(
		'/posts/:id',
		async ({ params: { id }, error }) => {
			try {
				const post = await db.query.posts.findFirst({ where: eq(posts.id, id) })
				if (!post) return error(404, 'Post not found')

				await db.delete(posts).where(eq(posts.id, id))
				await forgetFiles([post.key])

				return true
			} catch (err) {
				logError(err)
				return error(500, 'Failed to delete the post')
			}
		},
		{
			detail: { summary: 'Remove a clip' },
			params: t.Object({ id: t.String() }),
		},
	)

	// ---------------------------------------------------------------- users
	.get(
		'/users',
		async ({ error }) => {
			try {
				// Post count comes along so the admin can see who actually posts, and
				// what deleting an account would take with it.
				const rows = await db
					.select({
						id: users.id,
						name: users.name,
						avatarUrl: users.avatarUrl,
						isAdmin: users.isAdmin,
						createdAt: users.createdAt,
						postCount: count(posts.id),
					})
					.from(users)
					.leftJoin(posts, eq(posts.authorId, users.id))
					.groupBy(users.id)
					.orderBy(asc(users.name))

				return rows
			} catch (err) {
				logError(err)
				return error(500, 'Failed to load users')
			}
		},
		{
			detail: { summary: 'All users, with how much each has posted' },
		},
	)
	.post(
		'/users',
		async ({ body: { name, password, avatarUrl: avatar, isAdmin: makeAdmin }, error }) => {
			try {
				const trimmed = name.trim()
				if (!trimmed) return error(400, 'Name is required')

				const nameKey = nameKeyOf(trimmed)
				const existing = await db.query.users.findFirst({ where: eq(users.nameKey, nameKey) })
				if (existing) return error(409, `There's already a user called ${existing.name}`)

				const [created] = await db
					.insert(users)
					.values({
						name: trimmed,
						nameKey,
						passwordHash: await hashPassword(password),
						// Every user gets a face, whether or not the admin picked one.
						avatarUrl: avatar || avatarUrl(randomSeed(), DEFAULT_AVATAR_STYLE),
						isAdmin: makeAdmin ?? false,
					})
					.returning({
						id: users.id,
						name: users.name,
						avatarUrl: users.avatarUrl,
						isAdmin: users.isAdmin,
						createdAt: users.createdAt,
					})

				return created
			} catch (err) {
				logError(err)
				return error(500, 'Failed to create the user')
			}
		},
		{
			detail: { summary: 'Create a user (name + password is all they need)' },
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 60 }),
				password: t.String({ minLength: 4 }),
				avatarUrl: t.Optional(t.String()),
				isAdmin: t.Optional(t.Boolean()),
			}),
		},
	)
	.patch(
		'/users/:id',
		async ({ params: { id }, body, user, error }) => {
			try {
				const target = await db.query.users.findFirst({ where: eq(users.id, id) })
				if (!target) return error(404, 'User not found')

				const patch: Partial<typeof users.$inferInsert> = {}

				if (body.name !== undefined) {
					const trimmed = body.name.trim()
					if (!trimmed) return error(400, 'Name is required')

					const nameKey = nameKeyOf(trimmed)
					const clash = await db.query.users.findFirst({ where: eq(users.nameKey, nameKey) })
					if (clash && clash.id !== id) return error(409, `There's already a user called ${clash.name}`)

					patch.name = trimmed
					patch.nameKey = nameKey
				}

				if (body.password) patch.passwordHash = await hashPassword(body.password)
				if (body.avatarUrl) patch.avatarUrl = body.avatarUrl

				if (body.isAdmin !== undefined) {
					// Don't let the last admin (or yourself) lock the panel.
					if (target.id === user.id && !body.isAdmin) return error(400, "You can't remove your own admin access")
					patch.isAdmin = body.isAdmin
				}

				const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning({
					id: users.id,
					name: users.name,
					avatarUrl: users.avatarUrl,
					isAdmin: users.isAdmin,
					createdAt: users.createdAt,
				})

				return updated
			} catch (err) {
				logError(err)
				return error(500, 'Failed to update the user')
			}
		},
		{
			detail: { summary: 'Rename, re-avatar, reset the password or toggle admin' },
			params: t.Object({ id: t.String() }),
			body: t.Object({
				name: t.Optional(t.String({ maxLength: 60 })),
				password: t.Optional(t.String({ minLength: 4 })),
				avatarUrl: t.Optional(t.String()),
				isAdmin: t.Optional(t.Boolean()),
			}),
		},
	)
	.delete(
		'/users/:id',
		async ({ params: { id }, user, error }) => {
			try {
				if (id === user.id) return error(400, "You can't delete yourself")

				const target = await db.query.users.findFirst({ where: eq(users.id, id) })
				if (!target) return error(404, 'User not found')

				// Their posts go with them: the rows cascade, but R2 objects don't —
				// collect the keys before the delete or they're orphaned forever.
				const theirPosts = await db.select({ key: posts.key }).from(posts).where(eq(posts.authorId, id))

				await db.delete(users).where(eq(users.id, id))
				await forgetFiles(theirPosts.map(post => post.key))

				return { deletedPosts: theirPosts.length }
			} catch (err) {
				logError(err)
				return error(500, 'Failed to delete the user')
			}
		},
		{
			detail: { summary: 'Delete a user and everything they posted' },
			params: t.Object({ id: t.String() }),
		},
	)

export default AdminRoutes
