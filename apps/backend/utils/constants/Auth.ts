import { IS_PRODUCTION, WEBSITE_URL_WITHOUT_SSL } from './Domain'

/**
 * 400 days — the longest a cookie can realistically live. Chrome (and the
 * cookie spec since RFC6265bis) silently clamps anything above 400 days, so
 * asking for more just gets truncated.
 */
export const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60

export const AUTH_COOKIE_NAME = 'auth'

/**
 * Cookie attributes shared by login and logout.
 *
 * Locally the API (:5555) and the site (:3000) are the same site — ports are
 * not part of a cookie's origin — so `sameSite: lax` is enough and `secure`
 * would break plain http. In production the cookie is pinned to the parent
 * domain so `api.example.com` can set a cookie the site at `example.com` sends
 * back. If you ever host the API on a *different* registrable domain, this has
 * to become `sameSite: 'none'` with `secure: true`.
 */
export const authCookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: IS_PRODUCTION,
	...(IS_PRODUCTION && WEBSITE_URL_WITHOUT_SSL !== 'localhost' ? { domain: `.${WEBSITE_URL_WITHOUT_SSL}` } : {}),
} as const
