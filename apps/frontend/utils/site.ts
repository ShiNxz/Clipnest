import { cache } from 'react'
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE } from 'shared'
import eden from './eden'

export type SiteSettings = {
	title: string
	description: string
}

/**
 * What the site is called, as set in /admin.
 *
 * `cache` collapses the duplicate calls in one render — the root layout needs
 * this twice, once for `generateMetadata` and once to hand down to the client
 * tree — into a single request.
 *
 * `no-store` because an admin who renames the site expects to see it on the
 * next page load, not once a revalidation window closes. Nothing else here is
 * cached either: every page is client-rendered behind an auth check.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
	// `WEBSITE_NAME` predates this setting; honouring it keeps an existing
	// deployment's title in place until someone types a new one in /admin.
	const fallback: SiteSettings = {
		title: process.env.WEBSITE_NAME?.trim() || DEFAULT_SITE_TITLE,
		description: DEFAULT_SITE_DESCRIPTION,
	}

	try {
		const { data } = await eden.settings.index.get({ fetch: { cache: 'no-store' } })
		return data ?? fallback
	} catch {
		// Every page renders through the root layout, so an API that's down or not
		// yet up (a build, for instance) must not take the whole site with it.
		return fallback
	}
})
