import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
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

export const metadata = {
	title: process.env.WEBSITE_NAME || 'Clipnest',
	description: 'Clips and memes, between friends.',
}

export const viewport = {
	themeColor: '#0a0a0f',
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en" dir="ltr" suppressHydrationWarning>
			<head>
				<ColorSchemeScript defaultColorScheme="dark" />
			</head>
			<body className={`${inter.className} bg-ink-950 text-slate-200`}>
				<MantineProvider theme={theme} defaultColorScheme="dark">
					<Notifications position="top-right" />
					{children}
				</MantineProvider>
			</body>
		</html>
	)
}

export default RootLayout
