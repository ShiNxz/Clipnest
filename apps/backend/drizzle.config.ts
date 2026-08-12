import { defineConfig } from 'drizzle-kit'

/**
 * Only used by drizzle-kit (generate / studio). The app itself migrates on boot
 * via `runMigrations()` in db/index.ts, so a fresh clone needs no extra step.
 */
export default defineConfig({
	dialect: 'postgresql',
	schema: './db/schema.ts',
	out: './db/migrations',
	dbCredentials: process.env.DATABASE_URL
		? { url: process.env.DATABASE_URL }
		: { url: process.env.PGLITE_DIR || './.data/postgres' },
	...(process.env.DATABASE_URL ? {} : { driver: 'pglite' as const }),
})
