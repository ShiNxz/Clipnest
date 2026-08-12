import eden from '@/utils/eden'
import useSWR from 'swr'

export type Me = NonNullable<Awaited<ReturnType<typeof eden.auth.me.get>>['data']>

export const AUTH_KEY = 'auth-me'

/**
 * The logged-in user, or `null` when the session cookie is missing or stale.
 *
 * `data` is `undefined` while `isLoading` — callers must wait it out before
 * redirecting, or a refresh bounces a perfectly valid session to /login.
 */
const useAuth = () =>
	useSWR<Me | null>(AUTH_KEY, async () => {
		const { data, error } = await eden.auth.me.get()
		if (error) return null
		return data
	})

export default useAuth
