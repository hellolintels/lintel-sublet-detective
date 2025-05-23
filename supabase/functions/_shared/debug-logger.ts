
/**
 * Logger levels for controlling verbosity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LoggerOptions {
  module?: string;
  minLevel?: LogLevel;
  timestamps?: boolean;
  includeModule?: boolean;
  traceId?: string;
}

/**
 * Enhanced debug logger for Edge Functions
 */
export function createLogger(options: LoggerOptions = {}) {
  const {
    module = 'unknown',
    minLevel = LogLevel.DEBUG,
    timestamps = true,
    includeModule = true,
    traceId = undefined
  } = options;
  
  /**
   * Format a log message with appropriate metadata
   */
  function formatLogMessage(level: string, message: string, data?: any): string {
    const parts = [];
    
    if (timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    if (includeModule) {
      parts.push(`[${module}]`);
    }
    
    if (traceId) {
      parts.push(`[trace:${traceId}]`);
    }
    
    parts.push(`[${level}]`);
    parts.push(message);
    
    if (data !== undefined) {
      try {
        parts.push(typeof data === 'string' ? data : JSON.stringify(data));
      } catch (e) {
        parts.push('[Unstringifiable data]');
      }
    }
    
    return parts.join(' ');
  }
  
  const logger = {
    debug(message: string, data?: any) {
      if (minLevel <= LogLevel.DEBUG) {
        console.log(formatLogMessage('DEBUG', message, data));
      }
    },
    
    info(message: string, data?: any) {
      if (minLevel <= LogLevel.INFO) {
        console.log(formatLogMessage('INFO', message, data));
      }
    },
    
    warn(message: string, data?: any) {
      if (minLevel <= LogLevel.WARN) {
        console.warn(formatLogMessage('WARN', message, data));
      }
    },
    
    error(message: string, data?: any) {
      if (minLevel <= LogLevel.ERROR) {
        console.error(formatLogMessage('ERROR', message, data));
      }
    },
    
    /**
     * Time an async operation and log the duration
     */
    async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.debug(`${label} completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(`${label} failed after ${duration}ms`, error);
        throw error;
      }
    },
    
    /**
     * Create a child logger with additional context
     */
    child(childOptions: Partial<LoggerOptions>) {
      return createLogger({
        module,
        minLevel,
        timestamps,
        includeModule,
        traceId,
        ...childOptions
      });
    }
  };
  
  return logger;
}
