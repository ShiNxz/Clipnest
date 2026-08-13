import { headers } from 'next/headers'

/**
 * The site's own absolute address, e.g. "https://clips.example.com".
 *
 * Only shared posts need this, and they need it badly: a canonical URL, an
 * `og:url` and a JSON-LD `@id` all have to be absolute, and a link preview built
 * against the wrong host is a link preview nobody can click.
 *
 * `WEBSITE_URL` wins when it's set — it's the address the site is *meant* to be
 * reached at, which is what belongs in a canonical tag. Without it the request's
 * own headers do, so a fresh clone gets working share links with nothing
 * configured. `x-forwarded-*` first, because behind a proxy the raw `host` is
 * whatever the proxy dialled internally.
 */
export const siteOrigin = () => {
	const configured = process.env.WEBSITE_URL?.trim().replace(/\/+$/, '')
	if (configured) return configured

	const list = headers()
	const host = list.get('x-forwarded-host') ?? list.get('host')
	if (!host) return ''

	// A bare `localhost:3000` is the one case that genuinely isn't https.
	const fallbackProtocol = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https'

	return `${list.get('x-forwarded-proto') ?? fallbackProtocol}://${host}`
}
