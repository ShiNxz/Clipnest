import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '../db'
import { users } from '../db/schema'
import { AUTH_COOKIE_NAME, authCookieOptions } from '../utils/constants/Auth'
import jwtSetup from '../utils/lib/jwt'

/**
 * Attaches the logged-in `user` to the context, or answers 401.
 *
 * The token only carries a user id — the row is re-read on every request, so
 * deleting a user or flipping their admin flag takes effect immediately
 * instead of waiting out a year-long cookie.
 *
 * The trailing `.as('plugin')` is what makes the guard apply to the routes of
 * whichever instance `.use()`s it. Without it the derive stays local and covers
 * only routes defined in this file — i.e. none. It also has to be a lift rather
 * than a `{ as: 'scoped' }` on the derive itself, because `scoped` propagates
 * exactly one level: `isAdmin` wraps this plugin, so a scoped derive would stop
 * at `isAdmin` and never reach the /admin routes.
 */
export const isAuth = new Elysia({ name: 'isAuth' })
	.use(jwtSetup)
	.derive(async ({ jwt, cookie, error }) => {
		const auth = cookie[AUTH_COOKIE_NAME]

		const clear = () => auth?.set({ ...authCookieOptions, value: '', maxAge: 0, expires: new Date(0) })

		if (!auth?.value) return error(401, 'Unauthorized')

		const payload = await jwt.verify(auth.value)
		if (!payload || !payload.sub) {
			clear()
			return error(401, 'Unauthorized')
		}

		const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) })
		if (!user) {
			clear()
			return error(401, 'Unauthorized')
		}

		return { user }
	})
	.as('plugin')

export default isAuth
