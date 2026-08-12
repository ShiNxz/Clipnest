export const IS_PRODUCTION = Bun.env.NODE_ENV === 'production'

export const WEBSITE_URL = Bun.env.WEBSITE_URL || 'http://localhost:3000'

/** Bare host of the site, e.g. "clipnest.dev" — used as the cookie domain in production. */
export const WEBSITE_URL_WITHOUT_SSL = WEBSITE_URL.replace(/^https?:\/\//, '')
	.replace(/:\d+$/, '')
	.replace(/\/.*$/, '')
