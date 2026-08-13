import SiteProvider from '@/app/UI/SiteProvider'
import { getSiteSettings } from '@/utils/site'
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.scss'
import '@kirklin/reset-css/kirklin.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

const theme = createTheme({
	primaryColor: 'indigo',
	defaultRadius: 'md',
	fontFamily: 'inherit',
})

/**
 * The title and description are set in /admin, so the metadata has to be built
 * per request instead of exported as a constant.
 */
export const generateMetadata = async (): Promise<Metadata> => {
	const { title, description } = await getSiteSettings()

	return {
		title,
		description,
		applicationName: title,
		// What a link to the site looks like when it's pasted into a chat — the
		// same name and tagline, so a site dedicated to one group reads that way
		// everywhere, not just once you're inside it.
		openGraph: {
			type: 'website',
			siteName: title,
			title,
			description,
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
		},
	}
}

export const viewport = {
	themeColor: '#0a0a0f',
}

/**
 * The settings read is uncached, which already makes every route dynamic. Saying
 * so explicitly keeps `next build` from trying to prerender pages against an API
 * that isn't running yet.
 */
export const dynamic = 'force-dynamic'

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
	const site = await getSiteSettings()

	return (
		<html lang="en" dir="ltr" suppressHydrationWarning>
			<head>
				<ColorSchemeScript defaultColorScheme="dark" />
			</head>
			<body className={`${inter.className} bg-ink-950 text-slate-200`}>
				<MantineProvider theme={theme} defaultColorScheme="dark">
					<Notifications position="top-right" />
					<SiteProvider value={site}>{children}</SiteProvider>
				</MantineProvider>
			</body>
		</html>
	)
}

export default RootLayout
