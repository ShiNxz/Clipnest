import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { chalk } from 'logestic'
import { BUCKET, r2Client, toKey } from '.'

/** Delete a single object (idempotent — succeeds even if it doesn't exist). */
export const DeleteR2File = async (keyOrUrl: string) => {
	const Key = toKey(keyOrUrl)
	await r2Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))
	console.log(`${chalk.green('[Cloudflare R2]')} Deleted: ${Key}`)
}

/** Delete many objects (keys or URLs). Chunks to S3's limit of 1000 per request. */
export const DeleteManyR2Files = async (keysOrUrls: string[]) => {
	const all = keysOrUrls.map(toKey)
	let total = 0

	for (let i = 0; i < all.length; i += 1000) {
		const chunk = all.slice(i, i + 1000).map(Key => ({ Key }))
		await r2Client().send(
			new DeleteObjectsCommand({
				Bucket: BUCKET,
				Delete: { Objects: chunk, Quiet: true },
			}),
		)
		total += chunk.length
	}

	if (total) console.log(`${chalk.green('[Cloudflare R2]')} Deleted ${total} objects`)
	return total
}
