import { Elysia } from 'elysia'
import isAuth from './isAuth'

/**
 * `isAuth`, plus the admin flag. Anything under /admin goes through this.
 *
 * The `user` check is not redundant: when `isAuth` answers 401 this derive
 * still runs, and reading `.isAdmin` off an absent user would turn a clean 401
 * into a 500.
 */
export const isAdmin = new Elysia({ name: 'isAdmin' })
	.use(isAuth)
	.derive(({ user, error }) => {
		if (!user) return error(401, 'Unauthorized')
		if (!user.isAdmin) return error(403, 'Forbidden')
		return { user }
	})
	// Re-lifts this derive *and* the one inherited from isAuth, so both reach the
	// routes of whichever instance uses this plugin.
	.as('plugin')

export default isAdmin
