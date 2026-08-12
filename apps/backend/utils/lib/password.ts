/**
 * Password hashing uses Bun's built-in argon2id — no bcrypt dependency, and
 * `Bun.password.verify` reads the algorithm back out of the stored hash, so
 * changing algorithms later doesn't invalidate existing users.
 */
export const hashPassword = (password: string) => Bun.password.hash(password)

export const verifyPassword = async (password: string, hash: string) => {
	try {
		return await Bun.password.verify(password, hash)
	} catch {
		// A malformed hash throws rather than returning false.
		return false
	}
}

export { MIN_PASSWORD_LENGTH, randomPassword } from 'shared'
