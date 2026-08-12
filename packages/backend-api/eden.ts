import { edenFetch, treaty } from '@elysiajs/eden'
import type { App } from '../../apps/backend'

export const api = (url: string) =>
	treaty<App>(url, {
		fetch: {
			credentials: 'include',
		},
	})

export const fetch = (url: string) => edenFetch<App>(url, { credentials: 'include' })
