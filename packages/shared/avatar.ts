/**
 * Avatars come from DiceBear's public HTTP API — no account, no key, no image
 * to store. Everything about an avatar lives in its URL, so "give me another
 * one" is just a new seed and re-rolling costs nothing.
 *
 * Gravatar was the other option, but it keys off an email address and these
 * users only have a name and a password.
 */
export const AVATAR_STYLES = [
	'adventurer',
	'avataaars',
	'big-smile',
	'bottts',
	'fun-emoji',
	'lorelei',
	'micah',
	'notionists',
	'open-peeps',
	'personas',
	'pixel-art',
	'thumbs',
] as const

export type AvatarStyle = (typeof AVATAR_STYLES)[number]

export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'notionists'

export const isAvatarStyle = (value: string): value is AvatarStyle =>
	(AVATAR_STYLES as readonly string[]).includes(value)

/** A stable, URL-safe avatar for a given seed. Same seed in, same face out. */
export const avatarUrl = (seed: string, style: AvatarStyle = DEFAULT_AVATAR_STYLE) =>
	`https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`

export const randomSeed = () => crypto.randomUUID().slice(0, 8)

export const randomAvatarUrl = (style: AvatarStyle = DEFAULT_AVATAR_STYLE) => avatarUrl(randomSeed(), style)
