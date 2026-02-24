type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL as LogLevel | undefined
  if (env && env in LOG_LEVEL_PRIORITY) return env
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLevel()]
}

function formatDev(entry: LogEntry): string {
  const prefix = {
    debug: '\x1b[36mDEBUG\x1b[0m',
    info: '\x1b[32m INFO\x1b[0m',
    warn: '\x1b[33m WARN\x1b[0m',
    error: '\x1b[31mERROR\x1b[0m',
  }[entry.level]

  const ts = new Date(entry.timestamp).toLocaleTimeString()
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
  return `${ts} ${prefix} ${entry.message}${ctx}`
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
  }

  const json = JSON.stringify(entry)

  if (process.env.NODE_ENV === 'production') {
    const out = level === 'error' ? process.stderr : process.stdout
    out.write(json + '\n')
  } else {
    const consoleFn = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[level]
    consoleFn(formatDev(entry))
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
}
