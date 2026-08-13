import { IS_PRODUCTION, WEBSITE_URL_WITHOUT_SSL } from './Domain'

/**
 * 400 days — the longest a cookie can realistically live. Chrome (and the
 * cookie spec since RFC6265bis) silently clamps anything above 400 days, so
 * asking for more just gets truncated.
 */
export const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60

export const AUTH_COOKIE_NAME = 'auth'

/**
 * Which domain the session cookie is scoped to, in production.
 *
 * By default it's derived from WEBSITE_URL, which is right when the API is a
 * child of the site (`api.clips.example.com` + `clips.example.com` → scope it
 * to `.clips.example.com`).
 *
 * It is *not* right when the two are siblings. A host may only set cookies for
 * itself or one of its parents, so `clips-api.example.com` cannot set a cookie
 * scoped to `.clips.example.com` — the browser drops it silently and every
 * request comes back 401. In that setup point COOKIE_DOMAIN at the nearest
 * shared parent instead (`.example.com`).
 */
const COOKIE_DOMAIN = Bun.env.COOKIE_DOMAIN?.replace(/^\./, '') || WEBSITE_URL_WITHOUT_SSL

const useDomain = IS_PRODUCTION && COOKIE_DOMAIN && COOKIE_DOMAIN !== 'localhost'

/**
 * Cookie attributes shared by login and logout.
 *
 * Locally the API (:5600) and the site (:3000) are the same site — ports are
 * not part of a cookie's origin — so `sameSite: lax` is enough, and `secure`
 * would break plain http. It stays Lax in production too, as long as the API
 * and the site share a registrable domain. If you ever host the API on a
 * *different* registrable domain, this has to become `sameSite: 'none'` with
 * `secure: true`.
 */
export const authCookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: IS_PRODUCTION,
	...(useDomain ? { domain: `.${COOKIE_DOMAIN}` } : {}),
} as const
