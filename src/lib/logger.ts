type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  }

  const serialized = JSON.stringify(entry, (_key, value) =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
  )

  if (level === 'error') {
    console.error(serialized)
  } else if (level === 'warn') {
    console.warn(serialized)
  } else {
    console.log(serialized)
  }
}

/**
 * Простой структурированный логгер.
 * Всё, что нельзя показать пользователю, пишется сюда.
 */
export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') write('debug', message, context)
  },
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
}
