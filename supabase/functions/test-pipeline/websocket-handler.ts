
import { WebSocketScrapingResult } from './websocket-types.ts';
import { getExtractorsForPlatform } from './platform-extractors.ts';
import { processScrapingResult } from './result-processor.ts';

export async function executeWebSocketScraping(
  url: string, 
  postcodeData: any, 
  platform: string
): Promise<WebSocketScrapingResult> {
  const BRIGHT_DATA_WEBSOCKET_ENDPOINT = Deno.env.get("BRIGHT_DATA_WEBSOCKET_ENDPOINT");
  
  console.log(`🔌 Testing WebSocket connection for ${platform}`);
  console.log(`🔗 Endpoint configured: ${BRIGHT_DATA_WEBSOCKET_ENDPOINT ? 'YES' : 'NO'}`);
  
  if (!BRIGHT_DATA_WEBSOCKET_ENDPOINT) {
    console.error("❌ Bright Data WebSocket endpoint not configured");
    return {
      status: "error",
      count: 0,
      url,
      search_method: "websocket",
      boundary_method: "failed",
      precision: "none",
      message: "WebSocket endpoint not configured in secrets"
    };
  }

  const { postcode, streetName } = postcodeData;
  
  try {
    console.log(`🚀 Creating WebSocket connection to: ${BRIGHT_DATA_WEBSOCKET_ENDPOINT}`);
    const ws = new WebSocket(BRIGHT_DATA_WEBSOCKET_ENDPOINT);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error(`⏰ WebSocket timeout after 60s for ${platform}`);
        ws.close();
        resolve({
          status: "error",
          count: 0,
          url,
          search_method: "websocket",
          boundary_method: "timeout",
          precision: "none",
          message: `WebSocket timeout after 60 seconds`
        });
      }, 60000);

      ws.onopen = () => {
        console.log(`✅ WebSocket connected successfully for ${platform}`);
        
        const command = {
          action: 'navigate_and_extract',
          url: url,
          extractors: getExtractorsForPlatform(platform),
          postcode: postcode,
          streetName: streetName,
          platform: platform
        };
        
        console.log(`📤 Sending command:`, JSON.stringify(command, null, 2));
        ws.send(JSON.stringify(command));
      };

      ws.onmessage = (event) => {
        try {
          console.log(`📥 Received WebSocket response for ${platform}:`, event.data);
          const data = JSON.parse(event.data);
          clearTimeout(timeout);
          ws.close();
          
          const result = processScrapingResult(data, postcodeData, platform, url);
          console.log(`✅ Processed result for ${platform}:`, result);
          resolve(result);
        } catch (error) {
          console.error(`❌ Error processing WebSocket response for ${platform}:`, error);
          clearTimeout(timeout);
          ws.close();
          resolve({
            status: "error",
            count: 0,
            url,
            search_method: "websocket",
            boundary_method: "processing-error",
            precision: "none",
            message: `Error processing response: ${error.message}`
          });
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for ${platform}:`, error);
        clearTimeout(timeout);
        ws.close();
        resolve({
          status: "error",
          count: 0,
          url,
          search_method: "websocket",
          boundary_method: "connection-error",
          precision: "none",
          message: `WebSocket connection failed: ${error}`
        });
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed for ${platform}. Code: ${event.code}, Reason: ${event.reason}`);
        clearTimeout(timeout);
      };
    });
  } catch (error) {
    console.error(`❌ WebSocket creation failed for ${platform}:`, error);
    return {
      status: "error",
      count: 0,
      url,
      search_method: "websocket",
      boundary_method: "creation-error",
      precision: "none",
      message: `WebSocket creation failed: ${error.message}`
    };
  }
}
