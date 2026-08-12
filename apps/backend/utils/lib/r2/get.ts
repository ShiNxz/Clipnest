import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { BUCKET, r2Client, toKey } from '.'

const isNotFound = (err: unknown): boolean => {
	const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
	return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404
}

export type R2Head = {
	size: number
	contentType?: string
	lastModified?: Date
}

/** Metadata for an object, or null when it isn't there. Used to confirm an upload actually landed. */
export const headObject = async (keyOrUrl: string): Promise<R2Head | null> => {
	try {
		const res = await r2Client().send(new HeadObjectCommand({ Bucket: BUCKET, Key: toKey(keyOrUrl) }))
		return {
			size: res.ContentLength ?? 0,
			contentType: res.ContentType,
			lastModified: res.LastModified,
		}
	} catch (err) {
		if (isNotFound(err)) return null
		throw err
	}
}

export const objectExists = async (keyOrUrl: string) => (await headObject(keyOrUrl)) !== null

export type R2Object = {
	body: Buffer
	etag?: string
	contentType?: string
}

/** Fetch an object's bytes. Returns null if the object does not exist. */
export const getObjectBuffer = async (keyOrUrl: string): Promise<R2Object | null> => {
	try {
		const res = await r2Client().send(new GetObjectCommand({ Bucket: BUCKET, Key: toKey(keyOrUrl) }))
		if (!res.Body) return null

		const bytes = await res.Body.transformToByteArray()
		return {
			body: Buffer.from(bytes),
			etag: res.ETag?.replace(/"/g, ''),
			contentType: res.ContentType,
		}
	} catch (err) {
		if (isNotFound(err)) return null
		throw err
	}
}

export type R2ListItem = {
	key: string
	name: string
	lastModified?: Date
	size?: number
}

/** List objects under a prefix (follows pagination to the end). */
export const listKeys = async (prefix: string, opts: { delimiter?: string } = {}): Promise<R2ListItem[]> => {
	const Prefix = prefix.replace(/^\/+/, '')
	const items: R2ListItem[] = []
	let ContinuationToken: string | undefined

	do {
		const res = await r2Client().send(
			new ListObjectsV2Command({
				Bucket: BUCKET,
				Prefix,
				Delimiter: opts.delimiter,
				ContinuationToken,
			}),
		)

		for (const obj of res.Contents ?? []) {
			if (!obj.Key) continue
			items.push({
				key: obj.Key,
				name: obj.Key.split('/').pop() || obj.Key,
				lastModified: obj.LastModified,
				size: obj.Size,
			})
		}

		ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
	} while (ContinuationToken)

	return items
}
