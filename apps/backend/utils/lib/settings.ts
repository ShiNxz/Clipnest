import { eq } from 'drizzle-orm'
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE } from 'shared'
import { db } from '../../db'
import { SETTINGS_ROW_ID, type Settings, settings } from '../../db/schema'

/** What the API hands out — the row without its bookkeeping columns. */
export type SiteSettings = {
	title: string
	description: string
}

const publicSettings = (row: Settings): SiteSettings => ({
	title: row.title,
	description: row.description,
})

/**
 * The site's title and description.
 *
 * The row is written on the first save, not on boot, so reads fall back to the
 * shipped defaults while it's still missing — a database that predates this
 * table needs no data migration, and `WEBSITE_NAME` keeps working as the name
 * until an admin picks one.
 */
export const readSettings = async (): Promise<SiteSettings> => {
	const row = await db.query.settings.findFirst({ where: eq(settings.id, SETTINGS_ROW_ID) })

	return row
		? publicSettings(row)
		: {
				title: Bun.env.WEBSITE_NAME?.trim() || DEFAULT_SITE_TITLE,
				description: DEFAULT_SITE_DESCRIPTION,
			}
}

/**
 * Apply a patch to the settings, creating the row if this is the first save.
 *
 * An upsert rather than update-or-insert: the row's existence is never something
 * a caller has to think about, and two admins saving at once can't race into a
 * duplicate-key error.
 */
export const saveSettings = async (patch: Partial<SiteSettings>): Promise<SiteSettings> => {
	// Drizzle rejects an empty `set`, and a no-op save shouldn't touch updatedAt.
	if (!Object.keys(patch).length) return readSettings()

	const [row] = await db
		.insert(settings)
		.values({ id: SETTINGS_ROW_ID, ...patch })
		.onConflictDoUpdate({
			target: settings.id,
			set: { ...patch, updatedAt: new Date() },
		})
		.returning()

	return publicSettings(row)
}
