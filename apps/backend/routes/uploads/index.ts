import Elysia, { t } from 'elysia'
import isAuth from '../../middlewares/isAuth'
import { ALLOWED_MIME_PREFIXES, POSTS_PREFIX, SINGLE_PUT_LIMIT, extensionFor } from '../../utils/constants/Files'
import { logError } from '../../utils/lib/console'
import { type PresignedUpload, presignUpload } from '../../utils/lib/r2/presign'

type SignResult = ({ ok: true } & PresignedUpload) | { ok: false; reason: string }

const UploadRoutes = new Elysia({
	detail: {
		tags: ['Uploads'],
	},
})
	.use(isAuth)
	.post(
		'/sign',
		async ({ body, user, error }) => {
			try {
				// One round trip for a whole multi-select. Results come back in the same
				// order as `body.files`, each either signed or refused with a reason.
				return await Promise.all(
					body.files.map(async ({ fileName, contentType, size }): Promise<SignResult> => {
						if (!ALLOWED_MIME_PREFIXES.some(prefix => contentType.startsWith(prefix))) {
							return { ok: false, reason: 'Only images and videos can be posted' }
						}

						// There is no size limit of our own — this is S3's hard ceiling for a
						// single PUT, and getting past it needs a multipart upload rather
						// than a bigger number here.
						if (size && size > SINGLE_PUT_LIMIT) {
							return { ok: false, reason: 'File is over 5 GB — too big for a single upload' }
						}

						// Namespacing by user id is what lets `POST /posts` prove the caller
						// actually uploaded the key it claims.
						const key = `${POSTS_PREFIX}${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(
							fileName,
							contentType,
						)}`

						return { ok: true, ...(await presignUpload(key, contentType, { uploader: user.id })) }
					}),
				)
			} catch (err) {
				logError(err)
				return error(500, err instanceof Error ? err.message : 'Failed to sign upload')
			}
		},
		{
			detail: {
				summary: 'Get presigned R2 URLs to upload files straight from the browser',
			},
			body: t.Object({
				files: t.Array(
					t.Object({
						fileName: t.String(),
						contentType: t.String(),
						size: t.Optional(t.Number()),
					}),
					{ minItems: 1 },
				),
			}),
		},
	)

export default UploadRoutes
