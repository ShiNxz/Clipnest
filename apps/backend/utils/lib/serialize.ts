import type { User } from '../../db/schema'

/** Columns of `users` that are safe to hand to any logged-in client. Never includes the hash. */
export const publicUserColumns = {
	id: true,
	name: true,
	avatarUrl: true,
	isAdmin: true,
	createdAt: true,
} as const

export const publicUser = (user: User) => ({
	id: user.id,
	name: user.name,
	avatarUrl: user.avatarUrl,
	isAdmin: user.isAdmin,
	createdAt: user.createdAt,
})

/** The author blob attached to every post in the feed. */
export const authorColumns = {
	id: true,
	name: true,
	avatarUrl: true,
} as const
