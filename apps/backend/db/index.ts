import { mkdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { type PostgresJsDatabase, drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { chalk } from 'logestic'
import postgres from 'postgres'
import * as schema from './schema'

const { DATABASE_URL } = Bun.env

/**
 * Postgres either way.
 *
 * With `DATABASE_URL` set it's a normal server connection — that's what
 * production runs. Without it, the app falls back to PGlite: the real Postgres
 * engine compiled to WASM, persisting to a folder. Same SQL, same Drizzle
 * schema, same migrations, but `bun dev` works on a laptop with nothing
 * installed. Point `DATABASE_URL` at a server and the fallback is never used.
 */
export const usingPglite = !DATABASE_URL

const PGLITE_DIR = Bun.env.PGLITE_DIR || './.data/postgres'

const MIGRATIONS_FOLDER = './db/migrations'

// PGlite's mkdir isn't recursive, so it fails when `.data` itself is missing.
if (usingPglite) mkdirSync(PGLITE_DIR, { recursive: true })

const client = usingPglite ? new PGlite(PGLITE_DIR) : postgres(DATABASE_URL!, { max: 10 })

// The two drivers produce structurally identical query builders; the union type
// would just make every call site awkward, so it's narrowed to one of them.
export const db = (usingPglite
	? drizzlePglite(client as PGlite, { schema })
	: drizzlePostgres(client as ReturnType<typeof postgres>, { schema })) as unknown as PostgresJsDatabase<typeof schema>

/** Bring the database up to date with `db/migrations`. Called once on boot. */
export const runMigrations = async () => {
	if (usingPglite) {
		const { migrate } = await import('drizzle-orm/pglite/migrator')
		await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER })
	} else {
		const { migrate } = await import('drizzle-orm/postgres-js/migrator')
		await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER })
	}

	const where = usingPglite ? `PGlite (${PGLITE_DIR})` : 'Postgres'
	console.log(`${chalk.blueBright('[Database]')} Connected — ${where}, migrations up to date`)
}

export { schema }
