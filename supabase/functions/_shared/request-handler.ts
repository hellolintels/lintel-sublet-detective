
import { createLogger, handleError, LogLevel } from './debug-logger.ts';

const logger = createLogger({ module: 'request-handler' });

// Standard CORS headers for edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestHandlerOptions {
  enableCors?: boolean;
  logLevel?: LogLevel;
  skipLogging?: boolean;
}

/**
 * Request handler wrapper that provides:
 * - CORS handling 
 * - Request logging
 * - Performance timing
 * - Consistent error handling
 * - Response formatting
 */
export function createRequestHandler<T>(
  handler: (req: Request, log: ReturnType<typeof createLogger>) => Promise<T>, 
  options: RequestHandlerOptions = {}
) {
  const { enableCors = true, skipLogging = false } = options;
  
  return async (req: Request): Promise<Response> => {
    const requestLog = createLogger({ 
      module: 'http',
      correlationId: req.headers.get('x-correlation-id') || crypto.randomUUID().substring(0, 8)
    });
    
    // Handle CORS preflight requests
    if (enableCors && req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Log request details
    if (!skipLogging) {
      const url = new URL(req.url);
      requestLog.info(`${req.method} ${url.pathname}${url.search}`, {
        headers: Object.fromEntries(req.headers),
        method: req.method
      });
    }
    
    const startTime = performance.now();
    
    try {
      // Execute the handler with timing
      const result = await requestLog.time(
        'Request processing',
        () => handler(req, requestLog)
      );
      
      // Format successful response
      const responseBody = typeof result === 'string' 
        ? result 
        : JSON.stringify(result);
      
      const contentType = typeof result === 'string' && result.trim().startsWith('<') 
        ? 'text/html' 
        : 'application/json';
      
      const headers = {
        'Content-Type': contentType,
        ...(enableCors ? corsHeaders : {})
      };
      
      return new Response(responseBody, { status: 200, headers });
    } catch (error) {
      // Log and format error response
      const errorData = handleError(requestLog, error, 'Request handler error');
      const duration = performance.now() - startTime;
      
      requestLog.error(`Request failed after ${duration.toFixed(2)}ms`, { error });
      
      return new Response(
        JSON.stringify({ 
          error: true,
          message: errorData.message || 'Internal server error',
        }),
        { 
          status: 500, 
          headers: {
            'Content-Type': 'application/json',
            ...(enableCors ? corsHeaders : {})
          }
        }
      );
    }
  };
}
