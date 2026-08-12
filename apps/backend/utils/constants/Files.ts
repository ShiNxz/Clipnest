/** Everything a user posts lives under this prefix, namespaced per user id. */
export const POSTS_PREFIX = 'posts/'

/** How long a presigned upload URL stays valid. Generous, because a 2 GB clip on hotel wifi is a thing. */
export const PRESIGN_EXPIRES_SECONDS = 12 * 60 * 60

/**
 * There is deliberately no upload size limit — clips go straight from the
 * browser to R2 with a presigned PUT, so nothing streams through the API.
 * The only ceiling is S3's own single-PUT limit; past this a file would need a
 * multipart upload, so it's worth naming rather than failing mysteriously.
 */
export const SINGLE_PUT_LIMIT = 5 * 1024 * 1024 * 1024

/** Only images and videos are postable — a meme or a clip, nothing else. */
export const ALLOWED_MIME_PREFIXES = ['image/', 'video/'] as const

export const kindFromMime = (mime: string): 'image' | 'video' | null => {
	if (mime.startsWith('image/')) return 'image'
	if (mime.startsWith('video/')) return 'video'
	return null
}

/** Keep a usable extension off the original filename; fall back to the mime subtype. */
export const extensionFor = (fileName: string, mime: string) => {
	const fromName = fileName.includes('.') ? fileName.split('.').pop() : undefined
	if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase()

	const fromMime = mime.split('/')[1]?.split(';')[0]
	if (fromMime && /^[a-z0-9]{1,5}$/i.test(fromMime)) return fromMime.toLowerCase()

	return 'bin'
}
