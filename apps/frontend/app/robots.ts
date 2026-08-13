import type { MetadataRoute } from 'next'

/**
 * Crawl the shared posts. Nothing else.
 *
 * Every other page needs a session and would only ever give a crawler a login
 * screen, so the narrow allow-list is both the private answer and the accurate
 * one. It's a courtesy rather than a control — the real gate is that the API
 * answers 401 — but it keeps /login out of search results, and it stops a
 * crawler wasting requests on pages that will never have content for it.
 *
 * No `sitemap`: listing the shared posts would mean an endpoint that enumerates
 * them, and the whole design here is that a link reveals one post and implies
 * nothing about the rest. Shared links get found the way they're meant to be —
 * by someone pasting one.
 */
const robots = (): MetadataRoute.Robots => ({
	rules: [
		{
			userAgent: '*',
			allow: '/p/',
			disallow: '/',
		},
	],
})

export default robots
