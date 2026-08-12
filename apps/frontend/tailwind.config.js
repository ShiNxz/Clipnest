/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './utils/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			colors: {
				ink: {
					// The page sits on `ink-950`; cards and the header lift off it slightly.
					950: '#0a0a0f',
					900: '#12121a',
					800: '#1b1b26',
					700: '#272733',
				},
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
			},
			keyframes: {
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' },
				},
				'pop-in': {
					from: { opacity: '0', transform: 'scale(.97)' },
					to: { opacity: '1', transform: 'scale(1)' },
				},
			},
			animation: {
				'fade-in': 'fade-in .2s ease-out',
				'pop-in': 'pop-in .18s ease-out',
			},
		},
	},
	// Mantine ships its own reset; Tailwind's preflight on top of it fights over
	// button and input defaults.
	corePlugins: { preflight: false },
	plugins: [],
}
