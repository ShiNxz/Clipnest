import { warn } from '../console'
import { DeleteManyR2Files, DeleteR2File } from './delete'

/**
 * Remove stored files without letting storage trouble block the delete.
 *
 * The database row is what the site reads, so once it's gone the post is gone.
 * If R2 is unreachable (or was never configured) the object is orphaned — worth
 * a log line, not worth a 500 that leaves the admin unable to remove a clip.
 */
export const forgetFiles = async (keys: string[]) => {
	if (!keys.length) return

	try {
		if (keys.length === 1) await DeleteR2File(keys[0])
		else await DeleteManyR2Files(keys)
	} catch (err) {
		warn(`Could not remove ${keys.length} file(s) from R2 — they are now orphaned:`, err)
	}
}
