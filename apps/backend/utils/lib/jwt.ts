import { jwt } from '@elysiajs/jwt'
import { t } from 'elysia'

const jwtSetup = jwt({
	name: 'jwt',
	secret: Bun.env.SECRET || 'change-me',
	schema: t.Object({
		sub: t.String(),
	}),
})

export default jwtSetup
