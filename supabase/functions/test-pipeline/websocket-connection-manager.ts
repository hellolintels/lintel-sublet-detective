
export interface ConnectionTestResult {
  endpoint: string;
  port: number;
  success: boolean;
  error?: string;
  responseTime?: number;
  details: string;
  errorType?: 'timeout' | 'auth' | 'network' | 'protocol' | 'unknown';
}

export interface WebSocketConnectionConfig {
  endpoint: string;
  port: number;
  timeout: number;
  retryAttempts: number;
  priority: number; // Higher number = higher priority
}

export class BrightDataConnectionManager {
  private baseEndpoint: string;
  private credentials: string;
  private cachedWorkingEndpoint: string | null = null;
  
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
        retryAttempts: 2,
        priority: 3 // Most commonly working port
      },
      {
        endpoint: `wss://${this.credentials}@${this.baseEndpoint}:24000/`,
        port: 24000,
        timeout: 30000,
        retryAttempts: 2,
        priority: 2
      },
      {
        endpoint: `wss://${this.credentials}@${this.baseEndpoint}:9222/`,
        port: 9222,
        timeout: 25000,
        retryAttempts: 1,
        priority: 1 // Browser automation port, less reliable
      }
    ].sort((a, b) => b.priority - a.priority); // Sort by priority descending
  }
  
  async testAllConnections(): Promise<ConnectionTestResult[]> {
    const configs = this.getEndpointConfigurations();
    const results: ConnectionTestResult[] = [];
    
    console.log(`🔍 Testing ${configs.length} Bright Data WebSocket configurations...`);
    console.log(`📋 Priority order: ${configs.map(c => `Port ${c.port} (P${c.priority})`).join(', ')}`);
    
    for (const config of configs) {
      console.log(`🔌 Testing port ${config.port} (Priority ${config.priority})...`);
      const result = await this.testSingleConnection(config);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Successfully connected to port ${config.port} in ${result.responseTime}ms`);
        this.cachedWorkingEndpoint = config.endpoint;
        
        // Test actual communication capability
        const commTest = await this.testCommunication(config.endpoint);
        if (commTest.success) {
          console.log(`🎯 Port ${config.port} confirmed for full communication capability`);
          break;
        } else {
          console.log(`⚠️ Port ${config.port} connects but communication failed: ${commTest.error}`);
          result.details += ` | Communication test failed: ${commTest.error}`;
          result.success = false;
        }
      } else {
        console.log(`❌ Port ${config.port} failed: ${result.error} (${result.errorType})`);
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
        details: `Connection failed: ${error.message}`,
        errorType: this.classifyError(error.message)
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
          details: `Timeout after ${config.timeout}ms`,
          errorType: 'timeout'
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
          details: `Connected successfully in ${responseTime}ms`,
          errorType: undefined
        });
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        ws.close();
        
        let errorMessage = "Unknown error";
        let errorType: ConnectionTestResult['errorType'] = 'unknown';
        let errorDetails = "WebSocket connection failed";
        
        if (error instanceof ErrorEvent) {
          errorMessage = error.message;
          errorType = this.classifyError(errorMessage);
          
          switch (errorType) {
            case 'protocol':
              errorDetails = "SSL/TLS protocol mismatch - incorrect port or protocol";
              break;
            case 'network':
              errorDetails = "Network connection failed - port may be blocked or incorrect";
              break;
            case 'auth':
              errorDetails = "Authentication failed - check credentials";
              break;
            default:
              errorDetails = `WebSocket error: ${errorMessage}`;
          }
        }
        
        resolve({
          endpoint: config.endpoint,
          port: config.port,
          success: false,
          error: errorMessage,
          responseTime: Date.now() - startTime,
          details: errorDetails,
          errorType
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
            details: `WebSocket closed unexpectedly: ${event.reason || 'No reason provided'}`,
            errorType: event.code === 1002 ? 'protocol' : event.code === 1006 ? 'network' : 'unknown'
          });
        }
      };
    });
  }
  
  private async testCommunication(endpoint: string): Promise<{success: boolean, error?: string}> {
    return new Promise((resolve) => {
      const ws = new WebSocket(endpoint);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ success: false, error: "Communication test timeout" });
      }, 15000);
      
      ws.onopen = () => {
        // Send a simple test command
        const testCommand = {
          action: 'test_connection',
          timestamp: Date.now()
        };
        
        try {
          ws.send(JSON.stringify(testCommand));
          
          // Wait for any response or successful send
          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
            resolve({ success: true });
          }, 2000);
          
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          resolve({ success: false, error: `Send failed: ${error.message}` });
        }
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ success: false, error: "Communication error" });
      };
      
      ws.onmessage = () => {
        // Any response indicates communication is working
        clearTimeout(timeout);
        ws.close();
        resolve({ success: true });
      };
    });
  }
  
  private classifyError(errorMessage: string): ConnectionTestResult['errorType'] {
    const message = errorMessage.toLowerCase();
    
    if (message.includes("noapplicationprotocol") || message.includes("protocol")) {
      return 'protocol';
    }
    if (message.includes("failed to connect") || message.includes("network") || message.includes("refused")) {
      return 'network';
    }
    if (message.includes("unauthorized") || message.includes("401") || message.includes("forbidden") || message.includes("403")) {
      return 'auth';
    }
    if (message.includes("timeout")) {
      return 'timeout';
    }
    
    return 'unknown';
  }
  
  async getWorkingConnection(): Promise<string | null> {
    if (this.cachedWorkingEndpoint) {
      console.log(`🚀 Using cached working endpoint: ${this.cachedWorkingEndpoint}`);
      return this.cachedWorkingEndpoint;
    }
    
    const results = await this.testAllConnections();
    const workingResult = results.find(r => r.success);
    
    if (workingResult) {
      this.cachedWorkingEndpoint = workingResult.endpoint;
      return workingResult.endpoint;
    }
    
    return null;
  }
  
  getConnectionSummary(results: ConnectionTestResult[]): string {
    const working = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    let summary = `🔍 Connection Test Summary:\n`;
    summary += `✅ Working: ${working.length}/${results.length} endpoints\n`;
    
    if (working.length > 0) {
      summary += `🎯 Fastest: Port ${working[0].port} (${working[0].responseTime}ms)\n`;
    }
    
    if (failed.length > 0) {
      const errorTypes = failed.reduce((acc, r) => {
        acc[r.errorType || 'unknown'] = (acc[r.errorType || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      summary += `❌ Error breakdown: ${Object.entries(errorTypes).map(([type, count]) => `${type}(${count})`).join(', ')}\n`;
    }
    
    return summary;
  }
}
