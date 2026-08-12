export type MediaMeta = {
	width?: number
	height?: number
	/** Seconds. Videos only. */
	duration?: number
}

/** Browsers leave `file.type` empty for some sources (AirDrop, odd file managers). */
const EXTENSION_MIME: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif',
	heic: 'image/heic',
	bmp: 'image/bmp',
	mp4: 'video/mp4',
	m4v: 'video/mp4',
	mov: 'video/quicktime',
	webm: 'video/webm',
	mkv: 'video/x-matroska',
	avi: 'video/x-msvideo',
}

export const mimeOf = (file: File) => {
	if (file.type) return file.type

	const ext = file.name.split('.').pop()?.toLowerCase()
	return (ext && EXTENSION_MIME[ext]) || 'application/octet-stream'
}

export const isImage = (mime: string) => mime.startsWith('image/')
export const isVideo = (mime: string) => mime.startsWith('video/')

/**
 * Read dimensions (and duration, for video) locally before uploading.
 *
 * The server can't do this — the bytes go straight to R2 and never pass
 * through it — so the browser measures and sends the numbers along with the
 * post. Failure is not fatal: the feed just falls back to a default aspect
 * ratio for that item.
 */
export const probeMedia = (file: File): Promise<MediaMeta> => {
	const mime = mimeOf(file)
	const url = URL.createObjectURL(file)

	const done = (meta: MediaMeta): MediaMeta => {
		URL.revokeObjectURL(url)
		return meta
	}

	if (isImage(mime)) {
		return new Promise(resolve => {
			const image = new Image()
			image.onload = () => resolve(done({ width: image.naturalWidth, height: image.naturalHeight }))
			image.onerror = () => resolve(done({}))
			image.src = url
		})
	}

	if (isVideo(mime)) {
		return new Promise(resolve => {
			const video = document.createElement('video')
			video.preload = 'metadata'
			video.onloadedmetadata = () =>
				resolve(
					done({
						width: video.videoWidth || undefined,
						height: video.videoHeight || undefined,
						// Infinity shows up for some streamed/variable-bitrate files.
						duration: Number.isFinite(video.duration) ? video.duration : undefined,
					}),
				)
			video.onerror = () => resolve(done({}))
			video.src = url
		})
	}

	return Promise.resolve(done({}))
}
