import eden from '@/utils/eden'
import { type MediaMeta, mimeOf, probeMedia } from '@/utils/media'

/**
 * PUT the file straight to R2.
 *
 * XHR rather than fetch purely for `upload.onprogress` — fetch still has no
 * upload progress in browsers, and a 2 GB clip uploading behind a silent
 * spinner is unusable.
 */
const putToR2 = (uploadUrl: string, file: File, contentType: string, onProgress: (ratio: number) => void) =>
	new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest()

		xhr.open('PUT', uploadUrl, true)
		// Not part of the signature, but R2 stores it — and the API reads it back
		// to tell an image from a video.
		xhr.setRequestHeader('Content-Type', contentType)

		xhr.upload.onprogress = event => {
			if (event.lengthComputable) onProgress(event.loaded / event.total)
		}

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) return resolve()
			reject(
				new Error(
					xhr.status === 403
						? 'R2 rejected the upload — the signed URL expired, or the bucket CORS rule is missing'
						: `R2 rejected the upload (HTTP ${xhr.status})`,
				),
			)
		}

		xhr.onerror = () => reject(new Error('Upload failed — check the bucket CORS rule allows PUT from this origin'))
		xhr.onabort = () => reject(new Error('Upload cancelled'))

		xhr.send(file)
	})

export type UploadResult = {
	meta: MediaMeta
	key: string
}

/**
 * The whole publish flow for one file: ask the API to sign, upload to R2,
 * measure the file locally, then record the post.
 *
 * Progress covers the R2 PUT only — it's the part that takes real time.
 */
export const uploadAndPost = async (file: File, caption: string, onProgress: (ratio: number) => void) => {
	const contentType = mimeOf(file)

	const { data: signed, error: signError } = await eden.uploads.sign.post({
		files: [{ fileName: file.name, contentType, size: file.size }],
	})

	if (signError) throw new Error(String(signError.value ?? 'Could not start the upload'))

	const slot = signed?.[0]
	if (!slot) throw new Error('Could not start the upload')
	if (!slot.ok) throw new Error(slot.reason)

	// Measured while the bytes are already on their way out.
	const [meta] = await Promise.all([probeMedia(file), putToR2(slot.uploadUrl, file, contentType, onProgress)])

	const { data: post, error: postError } = await eden.posts.index.post({
		key: slot.key,
		caption,
		width: meta.width,
		height: meta.height,
		duration: meta.duration,
	})

	if (postError) throw new Error(String(postError.value ?? 'Uploaded, but publishing failed'))

	return post
}
