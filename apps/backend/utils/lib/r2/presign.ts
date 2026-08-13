import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { BUCKET, publicUrl, r2Client } from '.'
import { PRESIGN_EXPIRES_SECONDS } from '../../constants/Files'

export type PresignedUpload = {
	key: string
	/** PUT the raw file body here, with exactly this Content-Type. */
	uploadUrl: string
	/** Where the file will be readable once the PUT finishes. */
	url: string
	expiresIn: number
}

/**
 * Hand the browser a URL it can PUT straight to R2.
 *
 * This is what makes "any size, any length" work: the bytes never touch the
 * API, so there's no request body limit, no memory spike, no timeout to tune —
 * and no Cloudflare proxy cap, which is what would bite if uploads were routed
 * through the API instead. A 4 GB clip is strictly between the browser and
 * Cloudflare.
 *
 * Content-Type is not part of the signature, but the client must still send it
 * as a header on the PUT: R2 stores whatever it receives, and that stored value
 * is what `POST /posts` reads back to decide image vs video — and what the
 * browser later trusts when playing the file.
 */
export const presignUpload = async (
	key: string,
	contentType: string,
	metadata: Record<string, string> = {},
): Promise<PresignedUpload> => {
	const uploadUrl = await getSignedUrl(
		r2Client(),
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			ContentType: contentType,
			Metadata: metadata,
		}),
		{ expiresIn: PRESIGN_EXPIRES_SECONDS },
	)

	return {
		key,
		uploadUrl,
		url: publicUrl(key),
		expiresIn: PRESIGN_EXPIRES_SECONDS,
	}
}
