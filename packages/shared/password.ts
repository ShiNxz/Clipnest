/** Digits only, so it's easy to read out loud and type on a phone. */
const DIGITS = '0123456789'

/**
 * A throwaway password for a new account. Runs in both the browser (admin form's
 * 🎲 button) and Bun (seeding), so it sticks to Web Crypto.
 */
export const randomPassword = (length = 9) => {
	const bytes = crypto.getRandomValues(new Uint8Array(length))
	return Array.from(bytes, byte => DIGITS[byte % DIGITS.length]).join('')
}

export const MIN_PASSWORD_LENGTH = 4
