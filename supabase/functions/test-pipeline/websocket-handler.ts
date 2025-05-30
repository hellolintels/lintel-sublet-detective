
export interface WebSocketScrapingResult {
  status: string;
  count: number;
  totalFound?: number;
  url: string;
  search_method: string;
  boundary_method: string;
  precision: string;
  message?: string;
  matches?: any[];
}

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

function getExtractorsForPlatform(platform: string) {
  switch (platform) {
    case 'airbnb':
      return {
        listings: {
          selector: '[data-testid="card-container"], [data-testid="listing-card"]',
          extract: 'text'
        },
        totalCount: {
          selector: '[data-testid="homes-search-results-count"], .search-results-count, ._1l85cgq',
          extract: 'text'
        },
        mapInfo: {
          selector: '[data-testid="map"], .map-container',
          extract: 'text'
        }
      };
    case 'spareroom':
      return {
        listings: {
          selector: '.listing-result, .listingResult',
          extract: 'text'
        },
        totalCount: {
          selector: '.results-count, .search-results-summary',
          extract: 'text'
        }
      };
    case 'gumtree':
      return {
        listings: {
          selector: '.natural, .listing-link, .listing-item',
          extract: 'text'
        },
        totalCount: {
          selector: '.results-summary, .search-results-count',
          extract: 'text'
        }
      };
    default:
      return {
        listings: { selector: '.listing', extract: 'text' },
        totalCount: { selector: '.count', extract: 'text' }
      };
  }
}

function processScrapingResult(data: any, postcodeData: any, platform: string, url: string): WebSocketScrapingResult {
  const { postcode, streetName } = postcodeData;
  
  console.log(`🔍 Processing ${platform} scraping result:`, data);
  
  if (!data || !data.listings) {
    return {
      status: "no_match",
      count: 0,
      url,
      search_method: "websocket",
      boundary_method: "no-data",
      precision: "none",
      message: "No data received from scraping"
    };
  }

  // Extract property count for Airbnb
  let totalFound = 0;
  if (platform === 'airbnb' && data.totalCount && data.totalCount.text) {
    const countText = data.totalCount.text;
    console.log(`📊 Count text for ${platform}:`, countText);
    
    // Check for "Over 1,000 places" which indicates map is too broad
    if (countText.includes("Over 1,000") || countText.includes("1,000+")) {
      return {
        status: "too_broad",
        count: 0,
        totalFound: 1000,
        url,
        search_method: "websocket",
        boundary_method: "over-1000-detected",
        precision: "too-low",
        message: "Map area too broad - showing 'Over 1,000 places'. Need more precise search."
      };
    }
    
    const countMatch = countText.match(/(\d+)\s*places?\s*within\s*map\s*area/i) ||
                      countText.match(/(\d+)\s*properties?/i) ||
                      countText.match(/(\d+)/);
    if (countMatch) {
      totalFound = parseInt(countMatch[1], 10);
    }
  }

  const listings = Array.isArray(data.listings) ? data.listings : [];
  const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
  
  const matchedListings = listings.filter((listing: any) => {
    const text = listing.text || '';
    return postcodeRegex.test(text);
  });

  const validatedCount = matchedListings.length;
  
  return validatedCount > 0
    ? { 
        status: "investigate", 
        count: validatedCount,
        totalFound,
        url, 
        search_method: "websocket",
        boundary_method: "postcode-validated",
        precision: "high",
        message: `Found ${validatedCount} validated matches (${totalFound} total in area)`,
        matches: matchedListings
      }
    : { 
        status: "no_match", 
        count: 0,
        totalFound,
        url,
        search_method: "websocket", 
        boundary_method: "postcode-validated",
        precision: "medium",
        message: `No matches in postcode ${postcode} (${totalFound} total properties in search area)`
      };
}
