import type { User } from '../../db/schema'
import { publicUrl } from './r2'

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

/**
 * Stamp a post's public address on at read time.
 *
 * Rows store the R2 key alone; the bucket's public domain is configuration, and
 * a row that carries it is stale the moment the bucket moves. Every route that
 * hands a post to a client goes through here, so the client's contract is
 * unchanged — `url` is still there, it's just computed rather than remembered.
 */
export const withUrl = <T extends { key: string }>(post: T) => ({ ...post, url: publicUrl(post.key) })

/** A shared post, as an anonymous visitor is allowed to see it. */
export type PublicPost = ReturnType<typeof publicPost>

/**
 * Everything a shared post shows the outside world — and nothing else.
 *
 * Written as an explicit field list rather than a spread with deletions,
 * because this is the only place in the app where a row crosses the line from
 * "members only" to "anyone with the link". A spread would quietly publish
 * whatever column is added to `posts` next; this stops compiling instead.
 *
 * What's deliberately missing: the author's user id, the id of whoever shared
 * it, and every trace of who liked or commented. The tallies go out as bare
 * numbers — enough for the page to show that people were here, without naming
 * one person who never agreed to be named outside the group.
 */
export const publicPost = (post: {
	id: string
	caption: string
	kind: 'image' | 'video'
	key: string
	mime: string
	width: number | null
	height: number | null
	duration: number | null
	createdAt: Date
	sharedAt: Date | null
	author: { name: string; avatarUrl: string }
	likeCount: number
	commentCount: number
}) => ({
	id: post.id,
	caption: post.caption,
	kind: post.kind,
	url: publicUrl(post.key),
	mime: post.mime,
	width: post.width,
	height: post.height,
	duration: post.duration,
	createdAt: post.createdAt,
	sharedAt: post.sharedAt,
	author: { name: post.author.name, avatarUrl: post.author.avatarUrl },
	likeCount: post.likeCount,
	commentCount: post.commentCount,
})
