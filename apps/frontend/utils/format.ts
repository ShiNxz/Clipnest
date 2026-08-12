const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export const formatBytes = (bytes: number) => {
	if (!bytes) return '0 B'

	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
	const value = bytes / 1024 ** exponent

	return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${UNITS[exponent]}`
}

/** 92.4 → "1:32". Long clips get an hours part. */
export const formatDuration = (seconds?: number | null) => {
	if (!seconds || !Number.isFinite(seconds)) return null

	const total = Math.round(seconds)
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const secs = total % 60

	const pad = (n: number) => n.toString().padStart(2, '0')

	return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

const INTERVALS: [limit: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
	[60, 1, 'second'],
	[3600, 60, 'minute'],
	[86400, 3600, 'hour'],
	[604800, 86400, 'day'],
	[2629800, 604800, 'week'],
	[31557600, 2629800, 'month'],
	[Number.POSITIVE_INFINITY, 31557600, 'year'],
]

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const timeAgo = (date: string | Date) => {
	const seconds = (Date.now() - new Date(date).getTime()) / 1000
	if (seconds < 45) return 'just now'

	const match = INTERVALS.find(([limit]) => seconds < limit)
	if (!match) return ''

	const [, divisor, unit] = match
	return relative.format(-Math.round(seconds / divisor), unit)
}
