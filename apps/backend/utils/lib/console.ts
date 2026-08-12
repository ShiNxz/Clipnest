import { chalk } from 'logestic'
import { DEBUG_MODE } from '../constants/Debug'

export const log = (message?: unknown, ...optionalParams: unknown[]) => {
	console.log(chalk.cyanBright('[LOG] ') + message, ...optionalParams)
}

// biome-ignore lint/suspicious/noExplicitAny:
export const logDebug = (message?: any, ...optionalParams: any[]) => {
	if (!DEBUG_MODE) return
	console.debug(`${chalk.bgYellowBright('[DEBUG]')} ${message}`, ...optionalParams)
}

export const logError = (message?: unknown, ...optionalParams: unknown[]) => {
	console.error(`${chalk.bgRedBright('[ERROR]')} ${message}`, ...optionalParams)
}

// biome-ignore lint/suspicious/noExplicitAny:
export const warn = (message?: any, ...optionalParams: any[]) => {
	console.warn(`${chalk.bgYellowBright('[WARN]')} ${message}`, ...optionalParams)
}
