
import { createLogger, LogLevel } from './debug-logger.ts';

const logger = createLogger({ module: 'api-telemetry' });

interface ApiCallOptions {
  method?: string;
  headers?: HeadersInit;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  logLevel?: LogLevel;
  sensitiveHeaders?: string[];
  sensitiveBodyFields?: string[];
}

/**
 * Wrapper for fetch that adds:
 * - Logging of request/response details
 * - Performance monitoring
 * - Automatic retries
 * - Timeout handling
 * - Sensitive data masking
 */
export async function trackedFetch(
  url: string,
  options: ApiCallOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 10000,
    retries = 0,
    retryDelay = 500,
    logLevel = LogLevel.INFO,
    sensitiveHeaders = ['authorization', 'apikey', 'x-api-key'],
    sensitiveBodyFields = ['password', 'token', 'key', 'secret', 'apiKey']
  } = options;

  const apiLog = logger.child({ module: `api-${new URL(url).hostname}` });
  
  // Mask sensitive headers for logging
  const safeHeaders = { ...headers };
  for (const key of Object.keys(safeHeaders)) {
    if (sensitiveHeaders.some(h => key.toLowerCase().includes(h.toLowerCase()))) {
      safeHeaders[key] = '***REDACTED***';
    }
  }
  
  // Mask sensitive body fields for logging
  let safeBody = body;
  let requestBody = body;
  
  if (body && typeof body === 'object') {
    safeBody = { ...body };
    for (const key of Object.keys(safeBody)) {
      if (sensitiveBodyFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        safeBody[key] = '***REDACTED***';
      }
    }
    requestBody = JSON.stringify(body);
  } else if (typeof body === 'string') {
    try {
      // Try to parse as JSON for sensitive field masking
      const parsed = JSON.parse(body);
      safeBody = { ...parsed };
      
      for (const key of Object.keys(safeBody)) {
        if (sensitiveBodyFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
          safeBody[key] = '***REDACTED***';
        }
      }
      
      requestBody = body;
    } catch {
      // Not JSON, use as is
      requestBody = body;
      safeBody = body;
    }
  }
  
  // Log the outgoing request
  apiLog.debug(`${method} ${url}`, {
    headers: safeHeaders,
    body: safeBody
  });
  
  // Implementation of timeout logic
  const fetchWithTimeout = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  // Attempt the fetch with retry logic
  let attempt = 0;
  let lastError: unknown;
  
  while (attempt <= retries) {
    try {
      if (attempt > 0) {
        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        apiLog.info(`Retry attempt ${attempt}/${retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const startTime = performance.now();
      const response = await fetchWithTimeout();
      const duration = performance.now() - startTime;
      
      // Log response details
      apiLog.debug(`Response ${response.status} (${duration.toFixed(2)}ms)`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // If response indicates an error but is within retry limits, throw to trigger retry
      if (!response.ok && attempt < retries) {
        const responseText = await response.text();
        throw new Error(`API returned ${response.status}: ${responseText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      apiLog.warn(`API call failed (attempt ${attempt + 1}/${retries + 1})`, { error });
      attempt++;
    }
  }
  
  // If we reached here, all attempts failed
  apiLog.error(`API call failed after ${retries + 1} attempts`, { lastError });
  throw lastError;
}

/**
 * Helper to track API calls with automatic response parsing
 */
export async function trackApiCall<T = any>(
  url: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const response = await trackedFetch(url, options);
  
  // Parse response based on content type
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    return await response.json();
  } else if (contentType.includes('text/')) {
    return await response.text() as unknown as T;
  } else {
    return await response.blob() as unknown as T;
  }
}
