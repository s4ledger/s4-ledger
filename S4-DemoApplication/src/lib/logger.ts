/**
 * Structured Logger — JSON output in production, readable in development.
 * Sends warn/error to Sentry as breadcrumbs when available.
 */
import * as Sentry from '@sentry/react'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const MIN_LEVEL: LogLevel = import.meta.env.PROD ? 'info' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL]
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return

  if (import.meta.env.PROD) {
    // Structured JSON in production
    const entry = { ts: new Date().toISOString(), level, msg: message, ...data }
    if (level === 'error') console.error(JSON.stringify(entry))
    else if (level === 'warn') console.warn(JSON.stringify(entry))
    else console.log(JSON.stringify(entry))
  } else {
    // Readable in development
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(`[${level.toUpperCase()}] ${message}`, data ?? '')
  }

  // Forward warn/error to Sentry as breadcrumbs
  if (level === 'warn' || level === 'error') {
    Sentry.addBreadcrumb({
      category: 'logger',
      message,
      level: level === 'error' ? 'error' : 'warning',
      data,
    })
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
}
