import { eq } from 'drizzle-orm'
import { chalk } from 'logestic'
import { DEFAULT_AVATAR_STYLE, avatarUrl, randomPassword } from 'shared'
import { db, runMigrations } from '.'
import { hashPassword } from '../utils/lib/password'
import { users } from './schema'

/**
 * Makes sure there's an admin to log in as.
 *
 * Runs on every boot: it only ever creates the account described by
 * ADMIN_USERNAME / ADMIN_PASSWORD when that name doesn't exist yet, so
 * restarting never clobbers a password the admin changed later.
 */
export const seedAdmin = async () => {
	const name = (Bun.env.ADMIN_USERNAME || 'admin').trim()
	const nameKey = name.toLowerCase()

	const existing = await db.query.users.findFirst({ where: eq(users.nameKey, nameKey) })
	if (existing) return existing

	const password = Bun.env.ADMIN_PASSWORD || randomPassword()

	const [created] = await db
		.insert(users)
		.values({
			name,
			nameKey,
			passwordHash: await hashPassword(password),
			avatarUrl: avatarUrl(name, DEFAULT_AVATAR_STYLE),
			isAdmin: true,
		})
		.returning()

	console.log(
		`${chalk.magentaBright('[Seed]')} Created admin ${chalk.bold(name)} — password: ${chalk.bold(password)}${
			Bun.env.ADMIN_PASSWORD ? '' : ' (generated, write it down)'
		}`,
	)

	return created
}

// `bun run db/seed.ts` — useful when you want to seed without booting the API.
if (import.meta.main) {
	await runMigrations()
	await seedAdmin()
	process.exit(0)
}
