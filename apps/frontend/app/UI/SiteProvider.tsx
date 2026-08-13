'use client'

import type { SiteSettings } from '@/utils/site'
import { createContext, useContext } from 'react'

const SiteContext = createContext<SiteSettings | null>(null)

/**
 * The site's title and description, as the root layout read them.
 *
 * Handed down from the server rather than fetched again per component: the
 * header and the login screen both show the title immediately, with no flash of
 * the default name while a request is in flight.
 */
export const useSite = () => {
	const site = useContext(SiteContext)
	if (!site) throw new Error('useSite() needs a <SiteProvider> above it')

	return site
}

const SiteProvider = ({ value, children }: { value: SiteSettings; children: React.ReactNode }) => (
	<SiteContext.Provider value={value}>{children}</SiteContext.Provider>
)

export default SiteProvider
