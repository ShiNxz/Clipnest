import cron, { Patterns } from '@elysiajs/cron'

const heartbeatTask = cron({
	name: 'heartbeat',
	pattern: Patterns.EVERY_HOUR,
	run: () => {
		console.info('🎬 Heartbeat ❤️')
	},
})

export default heartbeatTask
