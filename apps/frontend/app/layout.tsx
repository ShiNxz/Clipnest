import SiteProvider from '@/app/UI/SiteProvider'
import { getSiteSettings } from '@/utils/site'
import { ColorSchemeScript, MantineProvider, type MantineColorsTuple, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.scss'
import '@kirklin/reset-css/kirklin.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

/**
 * Mantine's stock dark scale is pure neutral grey (#2e2e2e, #242424), which
 * reads as a flat grey box next to the page's blue-black ink. Every dark surface
 * Mantine paints — select and input backgrounds, the segmented control, menu and
 * popover dropdowns, modals, hover states — comes off this one scale, so tinting
 * it here fixes all of them at once instead of per component.
 *
 * The lightness steps are the stock ones; only the hue moved. The bottom four
 * are the app's own `ink` values, so a Mantine surface and a hand-written one
 * land on exactly the same colour.
 */
const ink: MantineColorsTuple = [
	'#cbcbd6',
	'#babac7',
	'#86869a',
	'#6b6b7e',
	'#43434f',
	'#353542',
	'#272733', // ink-700 — input backgrounds, hovers
	'#1b1b26', // ink-800 — dropdowns and modals, lifted off the page
	'#12121a', // ink-900 — cards
	'#0a0a0f', // ink-950 — the page itself
]

const theme = createTheme({
	primaryColor: 'indigo',
	defaultRadius: 'md',
	fontFamily: 'inherit',
	colors: { dark: ink },
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
