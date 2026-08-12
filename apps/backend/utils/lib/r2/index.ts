import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { chalk } from 'logestic'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = Bun.env

export const isR2Configured = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME)

export const BUCKET = R2_BUCKET_NAME || ''

/**
 * The client is built on first use rather than on import, so a fresh clone can
 * boot, log in and browse before anyone has set up a bucket — only the upload
 * routes fail, and they say exactly what's missing.
 */
let client: S3Client | null = null

export const r2Client = (): S3Client => {
	if (!isR2Configured) {
		throw new Error(
			'Cloudflare R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME in apps/backend/.env',
		)
	}

	if (!client) {
		client = new S3Client({
			region: 'auto',
			endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: R2_ACCESS_KEY_ID!,
				secretAccessKey: R2_SECRET_ACCESS_KEY!,
			},
			// Without this the SDK bakes `x-amz-checksum-crc32` into every presigned
			// PUT — computed over the *empty* body it has at signing time. The browser
			// then uploads real bytes and R2 rejects the mismatch. Nothing here needs
			// flexible checksums, so they're only computed when an API demands them.
			requestChecksumCalculation: 'WHEN_REQUIRED',
			responseChecksumValidation: 'WHEN_REQUIRED',
		})
	}

	return client
}

/** Accept a full https URL or a raw key; normalize to a key without a leading slash. */
export const toKey = (keyOrUrl: string): string => {
	if (/^https?:\/\//i.test(keyOrUrl)) {
		const url = new URL(keyOrUrl)
		return decodeURIComponent(url.pathname.replace(/^\/+/, ''))
	}
	return keyOrUrl.replace(/^\/+/, '')
}

/** Permanent public URL for a key. Requires the bucket to be exposed on R2_PUBLIC_URL. */
export const publicUrl = (keyOrUrl: string): string => {
	const key = toKey(keyOrUrl)
	if (R2_PUBLIC_URL) return `https://${R2_PUBLIC_URL}/${encodeURI(key)}`

	// Not actually public unless the bucket policy allows it — but better than returning nothing.
	return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${encodeURI(key)}`
}

/** Upload a buffer the API already holds. Direct browser → R2 uploads use `presign.ts` instead. */
export const uploadBuffer = async (
	buffer: Buffer,
	key: string,
	contentType = 'application/octet-stream',
	metadata: Record<string, string> = {},
) => {
	await r2Client().send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			Metadata: metadata,
		}),
	)

	return publicUrl(key)
}

export const logR2Status = () => {
	if (isR2Configured) {
		console.log(`${chalk.redBright('[Cloudflare R2]')} Bucket "${BUCKET}" — public at ${publicUrl('')}`)
	} else {
		console.warn(
			`${chalk.bgYellowBright('[Cloudflare R2]')} Not configured — the site works, but uploads will fail until R2_* is set in apps/backend/.env`,
		)
	}
}
