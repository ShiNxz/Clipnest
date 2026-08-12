import { asc, eq } from 'drizzle-orm'
import Elysia, { error, t } from 'elysia'
import { db } from '../../db'
import { users } from '../../db/schema'
import isAuth from '../../middlewares/isAuth'
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, authCookieOptions } from '../../utils/constants/Auth'
import jwtSetup from '../../utils/lib/jwt'
import { verifyPassword } from '../../utils/lib/password'
import { publicUser } from '../../utils/lib/serialize'

/** `/auth/me` is the only authenticated route here, so it gets its own guarded instance. */
const MeRoutes = new Elysia().use(isAuth).get('/me', ({ user }) => publicUser(user), {
	detail: { summary: 'The currently logged-in user' },
})

const AuthRoutes = new Elysia({
	detail: {
		tags: ['Auth'],
	},
})
	.use(jwtSetup)
	.get(
		'/users',
		async () => {
			// Public on purpose: the login screen is a dropdown of who's on the site.
			// Names and faces are all it exposes — never the hashes.
			return db
				.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
				.from(users)
				.orderBy(asc(users.name))
		},
		{
			detail: { summary: 'Names to pick from on the login screen' },
		},
	)
	.post(
		'/login',
		async ({ body: { userId, password }, jwt, cookie }) => {
			const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
			if (!user) return error(401, 'Wrong password')

			if (!(await verifyPassword(password, user.passwordHash))) return error(401, 'Wrong password')

			cookie[AUTH_COOKIE_NAME].set({
				...authCookieOptions,
				value: await jwt.sign({ sub: user.id }),
				maxAge: AUTH_COOKIE_MAX_AGE,
				expires: new Date(Date.now() + AUTH_COOKIE_MAX_AGE * 1000),
			})

			return publicUser(user)
		},
		{
			detail: { summary: 'Log in by picking a name and typing the password' },
			body: t.Object({
				userId: t.String(),
				password: t.String(),
			}),
		},
	)
	.post(
		'/logout',
		({ cookie }) => {
			cookie[AUTH_COOKIE_NAME].set({ ...authCookieOptions, value: '', maxAge: 0, expires: new Date(0) })
			return true
		},
		{
			detail: { summary: 'Clear the session cookie' },
		},
	)
	.use(MeRoutes)

export default AuthRoutes
