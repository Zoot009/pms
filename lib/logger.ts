/**
 * Structured logging utility
 * Use this instead of console.log for better observability in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private logLevel: LogLevel

  constructor() {
    // Set log level based on environment
    const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
    this.logLevel = level as LogLevel
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      environment: process.env.NODE_ENV,
    }

    // In production, output JSON for log aggregation tools
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logEntry)
    }

    // In development, use pretty formatting
    return logEntry
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      const log = this.formatLog('debug', message, context)
      console.log(log)
    }
  }

  info(context: LogContext, message: string): void
  info(message: string, context?: LogContext): void
  info(messageOrContext: string | LogContext, contextOrMessage?: string | LogContext) {
    if (this.shouldLog('info')) {
      // Handle both signatures
      let message: string
      let context: LogContext | undefined
      
      if (typeof messageOrContext === 'string') {
        message = messageOrContext
        context = contextOrMessage as LogContext | undefined
      } else {
        message = contextOrMessage as string
        context = messageOrContext
      }
      
      const log = this.formatLog('info', message, context)
      console.log(log)
    }
  }

  warn(context: LogContext, message: string): void
  warn(message: string, context?: LogContext): void
  warn(messageOrContext: string | LogContext, contextOrMessage?: string | LogContext) {
    if (this.shouldLog('warn')) {
      let message: string
      let context: LogContext | undefined
      
      if (typeof messageOrContext === 'string') {
        message = messageOrContext
        context = contextOrMessage as LogContext | undefined
      } else {
        message = contextOrMessage as string
        context = messageOrContext
      }
      
      const log = this.formatLog('warn', message, context)
      console.warn(log)
    }
  }

  error(context: LogContext, message: string): void
  error(message: string, context?: LogContext): void
  error(messageOrContext: string | LogContext, contextOrMessage?: string | LogContext) {
    if (this.shouldLog('error')) {
      let message: string
      let context: LogContext | undefined
      
      if (typeof messageOrContext === 'string') {
        message = messageOrContext
        context = contextOrMessage as LogContext | undefined
      } else {
        message = contextOrMessage as string
        context = messageOrContext
      }
      
      const log = this.formatLog('error', message, context)
      console.error(log)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Usage examples:
// logger.info('User logged in', { userId: '123', email: 'user@example.com' })
// logger.error('Failed to create order', { orderId, error: error.message })
// logger.warn('High memory usage', { memoryUsage: process.memoryUsage() })
