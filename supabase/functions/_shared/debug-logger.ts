
/**
 * Debug Logger Utility
 * A standardized logging utility for Supabase Edge Functions
 */

// Define log levels with numeric values for comparison
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Current log level - can be set via environment variable
const CURRENT_LOG_LEVEL = determineLogLevel();

// Configuration options for the logger
interface LoggerOptions {
  module?: string;      // Module/component name
  correlationId?: string; // Request correlation ID for tracing
  timestampFormat?: 'iso' | 'relative' | 'none'; // Timestamp format
}

// Structure for a log entry
interface LogEntry {
  level: LogLevel;
  message: string;
  module?: string;
  correlationId?: string;
  timestamp: string;
  data?: any;
  duration?: number; // For timed operations
}

/**
 * Determine the current log level from environment or default to INFO
 */
function determineLogLevel(): LogLevel {
  const envLevel = Deno.env.get('LOG_LEVEL')?.toUpperCase();
  
  if (envLevel) {
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'NONE': return LogLevel.NONE;
      default: return LogLevel.INFO;
    }
  }
  
  return LogLevel.INFO; // Default log level
}

/**
 * Format the current timestamp based on the specified format
 */
function formatTimestamp(format: 'iso' | 'relative' | 'none' = 'iso'): string {
  if (format === 'none') return '';
  
  if (format === 'relative') {
    // Use relative time since process start if available
    try {
      const now = performance.now();
      return `+${now.toFixed(2)}ms`;
    } catch {
      return new Date().toISOString();
    }
  }
  
  // Default to ISO format
  return new Date().toISOString();
}

/**
 * Create a logger instance with the specified options
 */
export function createLogger(options: LoggerOptions = {}) {
  const modulePrefix = options.module ? `[${options.module}] ` : '';
  const timestampFormat = options.timestampFormat || 'iso';
  const correlationId = options.correlationId;
  
  /**
   * Internal log function that handles all logging logic
   */
  function log(level: LogLevel, message: string, data?: any, duration?: number) {
    // Skip if this log level is below current threshold
    if (level < CURRENT_LOG_LEVEL) return;
    
    const entry: LogEntry = {
      level,
      message: `${modulePrefix}${message}`,
      timestamp: formatTimestamp(timestampFormat),
      ...(correlationId && { correlationId }),
      ...(data !== undefined && { data }),
      ...(duration !== undefined && { duration })
    };
    
    // Format the log message
    let logMessage = `${entry.timestamp} `;
    
    switch (level) {
      case LogLevel.DEBUG:
        logMessage += `🔍 DEBUG: ${entry.message}`;
        console.debug(logMessage, data !== undefined ? data : '');
        break;
      case LogLevel.INFO:
        logMessage += `ℹ️ INFO: ${entry.message}`;
        console.log(logMessage, data !== undefined ? data : '');
        break;
      case LogLevel.WARN:
        logMessage += `⚠️ WARN: ${entry.message}`;
        console.warn(logMessage, data !== undefined ? data : '');
        break;
      case LogLevel.ERROR:
        logMessage += `❌ ERROR: ${entry.message}`;
        console.error(logMessage, data !== undefined ? data : '');
        break;
    }
    
    // Add duration information if provided
    if (duration !== undefined) {
      console.log(`   ⏱️ Duration: ${duration.toFixed(2)}ms`);
    }
    
    return entry;
  }
  
  /**
   * Time an async function execution and log its duration
   */
  async function time<T>(level: LogLevel, message: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      log(level, `${message} (completed)`, undefined, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log(LogLevel.ERROR, `${message} (failed)`, { error }, duration);
      throw error;
    }
  }
  
  /**
   * Time a synchronous function execution and log its duration
   */
  function timeSync<T>(level: LogLevel, message: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      log(level, `${message} (completed)`, undefined, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log(LogLevel.ERROR, `${message} (failed)`, { error }, duration);
      throw error;
    }
  }
  
  return {
    debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
    info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
    warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
    error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
    time: <T>(message: string, fn: () => Promise<T>, level = LogLevel.INFO) => time(level, message, fn),
    timeSync: <T>(message: string, fn: () => T, level = LogLevel.INFO) => timeSync(level, message, fn),
    
    // Create a child logger with inherited settings
    child: (childOptions: LoggerOptions) => {
      return createLogger({
        module: childOptions.module || options.module,
        correlationId: childOptions.correlationId || options.correlationId,
        timestampFormat: childOptions.timestampFormat || options.timestampFormat
      });
    },
    
    // Create a logger for request handling with correlation ID
    forRequest: (req: Request) => {
      // Generate or extract correlation ID
      const correlationId = req.headers.get('x-correlation-id') || 
                            crypto.randomUUID().substring(0, 8);
      
      return createLogger({
        module: options.module,
        correlationId,
        timestampFormat: options.timestampFormat
      });
    }
  };
}

/**
 * Track memory usage and log if it exceeds thresholds
 */
export function monitorMemoryUsage(logger: ReturnType<typeof createLogger>, thresholdMB = 100) {
  try {
    if (typeof Deno.memoryUsage !== 'function') return; // Not available
    
    const memoryUsage = Deno.memoryUsage();
    const usedMemoryMB = memoryUsage.heapUsed / (1024 * 1024);
    
    if (usedMemoryMB > thresholdMB) {
      logger.warn(`High memory usage: ${usedMemoryMB.toFixed(2)} MB`, memoryUsage);
    }
    
    return usedMemoryMB;
  } catch (error) {
    logger.error('Failed to monitor memory usage', error);
    return null;
  }
}

/**
 * Helper to handle errors consistently
 */
export function handleError(
  logger: ReturnType<typeof createLogger>,
  error: unknown,
  context: string,
  extraData?: any
) {
  const errorObj = error instanceof Error 
    ? { message: error.message, stack: error.stack } 
    : { message: String(error) };
  
  logger.error(`${context}: ${errorObj.message}`, { ...errorObj, ...extraData });
  
  return {
    error: true,
    message: errorObj.message,
    context
  };
}

/**
 * Default root logger instance
 */
export const logger = createLogger({ module: 'root' });
