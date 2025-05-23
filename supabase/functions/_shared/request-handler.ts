import { createLogger } from './debug-logger.ts';

export interface RequestContext {
  requestId: string;
}

/**
 * Create a request handler with logging and error handling
 */
export function createRequestHandler(
  handler: (req: Request, log: ReturnType<typeof createLogger>) => Promise<any>
) {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Create a logger for this request
    const log = createLogger({
      module: 'edge-function',
      traceId: requestId
    });
    
    log.debug(`${req.method} ${req.url}`);
    
    try {
      // Call the actual handler
      const response = await handler(req, log);
      const duration = Date.now() - startTime;
      
      // If response is already a Response, return it
      if (response instanceof Response) {
        log.debug(`Request completed in ${duration}ms`);
        return response;
      }
      
      // Otherwise convert to JSON response
      log.debug(`Request succeeded in ${duration}ms`);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Response-Time': duration.toString()
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error(`Request failed after ${duration}ms: ${error.message}`);
      
      // Return error response
      return new Response(
        JSON.stringify({
          error: error.message || 'Unknown error',
          requestId
        }),
        {
          status: error.statusCode || 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Response-Time': duration.toString()
          }
        }
      );
    }
  };
}
