
import { PostcodeResult, ScrapingResult } from './types.ts';

async function executeWebSocketScraping(url: string, postcodeData: PostcodeResult, platform: string) {
  const BRIGHT_DATA_WEBSOCKET_ENDPOINT = Deno.env.get("BRIGHT_DATA_WEBSOCKET_ENDPOINT");
  
  if (!BRIGHT_DATA_WEBSOCKET_ENDPOINT) {
    throw new Error("Bright Data WebSocket endpoint not configured");
  }

  const { postcode, streetName } = postcodeData;
  
  try {
    const ws = new WebSocket(BRIGHT_DATA_WEBSOCKET_ENDPOINT);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout'));
      }, 60000);

      ws.onopen = () => {
        console.log(`WebSocket connected for ${platform} scraping`);
        
        const command = {
          action: 'navigate_and_extract',
          url: url,
          extractors: {
            listings: {
              selector: '.natural, .listing-link, .listing-item',
              extract: 'text'
            },
            totalCount: {
              selector: '.results-summary, .search-results-count',
              extract: 'text'
            }
          },
          postcode: postcode,
          streetName: streetName
        };
        
        ws.send(JSON.stringify(command));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          clearTimeout(timeout);
          ws.close();
          
          const result = processGumtreeResult(data, postcodeData, url);
          resolve(result);
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      };

      ws.onclose = () => {
        clearTimeout(timeout);
      };
    });
  } catch (error) {
    console.error(`WebSocket error for ${platform}:`, error);
    return { status: "error", message: error.message, url };
  }
}

function processGumtreeResult(data: any, postcodeData: PostcodeResult, url: string) {
  const { postcode, streetName } = postcodeData;
  
  if (!data || !data.listings) {
    return { status: "no_match", url, count: 0 };
  }

  const listings = Array.isArray(data.listings) ? data.listings : [];
  const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
  
  const matchedListings = listings.filter((listing: any) => {
    const text = listing.text || '';
    const hasExactPostcode = postcodeRegex.test(text);
    return hasExactPostcode;
  });

  const matchCount = matchedListings.length;
  
  return matchCount > 0
    ? { 
        status: "investigate", 
        url, 
        count: matchCount,
        search_method: "full-address",
        precision: "high",
        message: `Found ${matchCount} validated matches using full address search`
      }
    : { 
        status: "no_match", 
        url, 
        count: 0,
        search_method: "full-address",
        precision: "high",
        message: `No matches found in postcode ${postcode}`
      };
}

export async function testScrapeGumtree(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  console.log(`Testing Gumtree with real scraping for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  console.log(`Using full address search: ${searchQuery}`);
  
  try {
    const result = await executeWebSocketScraping(searchUrl, postcodeData, 'gumtree');
    return {
      ...result,
      search_method: "full-address",
      precision: "high"
    };
  } catch (error) {
    console.error(`Gumtree scraping failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: searchUrl,
      search_method: "full-address",
      precision: "high",
      message: `Gumtree scraping failed: ${error.message}`
    };
  }
}
