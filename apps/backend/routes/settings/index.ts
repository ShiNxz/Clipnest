import Elysia, { t } from 'elysia'
import { SITE_DESCRIPTION_MAX_LENGTH, SITE_TITLE_MAX_LENGTH } from 'shared'
import isAdmin from '../../middlewares/isAdmin'
import { logError } from '../../utils/lib/console'
import { type SiteSettings, readSettings, saveSettings } from '../../utils/lib/settings'

/** Only admins may re-title the site, so the write gets its own guarded instance. */
const AdminSettingsRoutes = new Elysia().use(isAdmin).patch(
	'/',
	async ({ body, error }) => {
		try {
			const patch: Partial<SiteSettings> = {}

			if (body.title !== undefined) {
				const title = body.title.trim()
				// Without a title there'd be nothing in the tab or the header at all.
				if (!title) return error(400, 'The site needs a title')
				patch.title = title
			}

			// The description may be blank — a site is allowed to have no tagline.
			if (body.description !== undefined) patch.description = body.description.trim()

			return await saveSettings(patch)
		} catch (err) {
			logError(err)
			return error(500, 'Failed to save the settings')
		}
	},
	{
		detail: { summary: 'Rename the site (admin only)' },
		body: t.Object({
			title: t.Optional(t.String({ maxLength: SITE_TITLE_MAX_LENGTH })),
			description: t.Optional(t.String({ maxLength: SITE_DESCRIPTION_MAX_LENGTH })),
		}),
	},
)

const SettingsRoutes = new Elysia({
	detail: {
		tags: ['Settings'],
	},
})
	.get(
		'/',
		async ({ error }) => {
			try {
				// Public on purpose: the login page shows the title before anyone is
				// logged in, and the site's metadata is rendered for crawlers.
				return await readSettings()
			} catch (err) {
				logError(err)
				return error(500, 'Failed to load the settings')
			}
		},
		{
			detail: { summary: "The site's title and description" },
		},
	)
	.use(AdminSettingsRoutes)

export default SettingsRoutes
