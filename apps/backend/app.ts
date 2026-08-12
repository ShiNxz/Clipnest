import cors from '@elysiajs/cors'
import { Elysia, redirect } from 'elysia'
import compression from 'elysia-compress'
import { Logestic } from 'logestic'

import { runMigrations } from './db'
import { seedAdmin } from './db/seed'
import routes from './routes'
import { WEBSITE_URL } from './utils/constants/Domain'
import jwtSetup from './utils/lib/jwt'
import { logR2Status } from './utils/lib/r2'
import swagger from './utils/swagger'

// Tasks
import heartbeatTask from './tasks/heartbeat'

// The database has to be ready before the first request lands.
await runMigrations()
await seedAdmin()
logR2Status()

const app = new Elysia()
	.use(Logestic.preset('fancy'))
	.use(swagger)
	.use(compression())
	.use(
		cors({
			origin: true,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.use(jwtSetup)
	.use(routes)
	.get('/', () => redirect(WEBSITE_URL))
	.listen(Bun.env.API_PORT || 6100, () => {
		console.log(`🎬 Clipnest API is running on port ${Bun.env.API_PORT || 6100}`)
	})

if (Bun.env.NODE_ENV === 'production') {
	// Tasks
	app.use(heartbeatTask)
}

export type App = typeof app
