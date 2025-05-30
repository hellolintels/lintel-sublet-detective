
export interface ConnectionTestResult {
  endpoint: string;
  port: number;
  success: boolean;
  error?: string;
  responseTime?: number;
  details: string;
}

export interface WebSocketConnectionConfig {
  endpoint: string;
  port: number;
  timeout: number;
  retryAttempts: number;
}

export class BrightDataConnectionManager {
  private baseEndpoint: string;
  private credentials: string;
  
  constructor() {
    const endpoint = Deno.env.get("BRIGHT_DATA_WEBSOCKET_ENDPOINT");
    if (!endpoint) {
      throw new Error("BRIGHT_DATA_WEBSOCKET_ENDPOINT not configured");
    }
    
    // Extract base endpoint and credentials
    const urlMatch = endpoint.match(/wss:\/\/([^@]+)@([^:]+)/);
    if (!urlMatch) {
      throw new Error("Invalid WebSocket endpoint format");
    }
    
    this.credentials = urlMatch[1];
    this.baseEndpoint = urlMatch[2];
  }
  
  private getEndpointConfigurations(): WebSocketConnectionConfig[] {
    return [
      {
        endpoint: `wss://${this.credentials}@${this.baseEndpoint}:22225/`,
        port: 22225,
        timeout: 30000,
        retryAttempts: 2
      },
      {
        endpoint: `wss://${this.credentials}@${this.baseEndpoint}:24000/`,
        port: 24000,
        timeout: 30000,
        retryAttempts: 2
      },
      {
        endpoint: `wss://${this.credentials}@${this.baseEndpoint}:9222/`,
        port: 9222,
        timeout: 30000,
        retryAttempts: 1
      }
    ];
  }
  
  async testAllConnections(): Promise<ConnectionTestResult[]> {
    const configs = this.getEndpointConfigurations();
    const results: ConnectionTestResult[] = [];
    
    console.log(`🔍 Testing ${configs.length} Bright Data WebSocket configurations...`);
    
    for (const config of configs) {
      console.log(`🔌 Testing port ${config.port}...`);
      const result = await this.testSingleConnection(config);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Successfully connected to port ${config.port}`);
        break; // Found working connection
      } else {
        console.log(`❌ Port ${config.port} failed: ${result.error}`);
      }
    }
    
    return results;
  }
  
  private async testSingleConnection(config: WebSocketConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      return await this.attemptConnection(config, startTime);
    } catch (error) {
      return {
        endpoint: config.endpoint,
        port: config.port,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        details: `Connection failed: ${error.message}`
      };
    }
  }
  
  private async attemptConnection(config: WebSocketConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    return new Promise((resolve) => {
      const ws = new WebSocket(config.endpoint);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          endpoint: config.endpoint,
          port: config.port,
          success: false,
          error: "Connection timeout",
          responseTime: Date.now() - startTime,
          details: `Timeout after ${config.timeout}ms`
        });
      }, config.timeout);
      
      ws.onopen = () => {
        const responseTime = Date.now() - startTime;
        clearTimeout(timeout);
        ws.close();
        
        resolve({
          endpoint: config.endpoint,
          port: config.port,
          success: true,
          responseTime,
          details: `Connected successfully in ${responseTime}ms`
        });
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        ws.close();
        
        let errorMessage = "Unknown error";
        let errorDetails = "WebSocket connection failed";
        
        if (error instanceof ErrorEvent) {
          errorMessage = error.message;
          
          if (errorMessage.includes("NoApplicationProtocol")) {
            errorDetails = "SSL/TLS protocol mismatch - incorrect port or protocol";
          } else if (errorMessage.includes("failed to connect")) {
            errorDetails = "Network connection failed - port may be blocked or incorrect";
          } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
            errorDetails = "Authentication failed - check credentials";
          } else if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
            errorDetails = "Access forbidden - check zone permissions";
          }
        }
        
        resolve({
          endpoint: config.endpoint,
          port: config.port,
          success: false,
          error: errorMessage,
          responseTime: Date.now() - startTime,
          details: errorDetails
        });
      };
      
      ws.onclose = (event) => {
        clearTimeout(timeout);
        
        if (event.code !== 1000) { // Not normal closure
          resolve({
            endpoint: config.endpoint,
            port: config.port,
            success: false,
            error: `Connection closed with code ${event.code}`,
            responseTime: Date.now() - startTime,
            details: `WebSocket closed unexpectedly: ${event.reason || 'No reason provided'}`
          });
        }
      };
    });
  }
  
  async getWorkingConnection(): Promise<string | null> {
    const results = await this.testAllConnections();
    const workingResult = results.find(r => r.success);
    return workingResult ? workingResult.endpoint : null;
  }
}
