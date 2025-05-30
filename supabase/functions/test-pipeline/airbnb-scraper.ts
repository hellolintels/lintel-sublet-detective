
import { PostcodeResult, ScrapingResult } from './types.ts';

// Import the real WebSocket scraper function
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
              selector: '[data-testid="card-container"]',
              extract: 'text'
            },
            totalCount: {
              selector: '[data-testid="homes-search-results-count"], .search-results-count, .results-header',
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
          
          // Process the extracted data
          const result = processScrapingResult(data, postcodeData, platform, url);
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

function processScrapingResult(data: any, postcodeData: PostcodeResult, platform: string, url: string) {
  const { postcode, streetName } = postcodeData;
  
  if (!data || !data.listings) {
    return { status: "no_match", url, count: 0 };
  }

  // Extract property count from Airbnb's results count text
  let propertyCount = 0;
  if (data.totalCount && data.totalCount.text) {
    const countMatch = data.totalCount.text.match(/(\d+)\s*places?\s*within\s*map\s*area/i) ||
                      data.totalCount.text.match(/(\d+)\s*properties?/i) ||
                      data.totalCount.text.match(/(\d+)/);
    if (countMatch) {
      propertyCount = parseInt(countMatch[1], 10);
    }
  }

  const listings = Array.isArray(data.listings) ? data.listings : [];
  const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
  
  // Filter listings to only include those matching the target postcode
  const matchedListings = listings.filter((listing: any) => {
    const text = listing.text || '';
    const hasExactPostcode = postcodeRegex.test(text);
    return hasExactPostcode;
  }).map((listing: any) => ({
    title: listing.text?.substring(0, 100) || `${platform} listing`,
    hasExactPostcode: true,
    hasStreetNameMatch: streetName ? listing.text?.toLowerCase().includes(streetName.toLowerCase()) : false,
    confidenceScore: 0.8
  }));

  const validatedCount = matchedListings.length;
  
  return validatedCount > 0
    ? { 
        status: "investigate", 
        url, 
        count: validatedCount,
        totalFound: propertyCount,
        matches: matchedListings,
        search_method: "native-location-search",
        boundary_method: "Airbnb native location search with postcode validation",
        precision: "high",
        message: `Found ${validatedCount} validated matches (${propertyCount} total in area) using native location search`
      }
    : { 
        status: "no_match", 
        url, 
        count: 0,
        totalFound: propertyCount,
        search_method: "native-location-search",
        boundary_method: "Airbnb native location search",
        precision: "high",
        message: `No matches found in postcode ${postcode} (${propertyCount} total properties in search area)`
      };
}

export async function testScrapeAirbnb(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, latitude, longitude, address } = postcodeData;
  console.log(`Testing Airbnb with native location search for: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  let searchUrl: string;
  let searchMethod: string;
  let boundaryMethod: string;
  
  // Primary approach: Use Airbnb's native location search with postcode
  const locationQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(locationQuery)}/homes`;
  searchMethod = "native-location-search";
  boundaryMethod = "Airbnb native location search with postcode validation";
  
  console.log(`Using native location search: ${locationQuery}`);
  
  try {
    // Use real Bright Data scraping instead of simulation
    const result = await executeWebSocketScraping(searchUrl, postcodeData, 'airbnb');
    
    // Add search method metadata
    return {
      ...result,
      search_method: searchMethod,
      boundary_method: boundaryMethod,
      precision: "high"
    };
    
  } catch (error) {
    console.error(`Real scraping failed for ${postcode}, falling back to coordinate search:`, error);
    
    // Fallback: Use coordinate search with small radius if location search fails
    if (latitude && longitude) {
      const precision = 0.00005; // ~5m radius for ultra-precise search
      const swLat = latitude - precision;
      const swLng = longitude - precision; 
      const neLat = latitude + precision;
      const neLng = longitude + precision;
      
      const fallbackUrl = `https://www.airbnb.com/s/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}&zoom=19&center_lat=${latitude}&center_lng=${longitude}`;
      
      console.log(`Fallback: Using coordinate search with 5m radius: ${latitude}, ${longitude}`);
      
      try {
        const fallbackResult = await executeWebSocketScraping(fallbackUrl, postcodeData, 'airbnb');
        return {
          ...fallbackResult,
          search_method: "coordinate-fallback",
          boundary_method: "5m coordinate radius fallback",
          precision: "medium"
        };
      } catch (fallbackError) {
        console.error(`Coordinate fallback also failed for ${postcode}:`, fallbackError);
        return {
          status: "error",
          count: 0,
          url: searchUrl,
          search_method: searchMethod,
          boundary_method: boundaryMethod,
          precision: "low",
          message: `Both native search and coordinate fallback failed: ${fallbackError.message}`
        };
      }
    } else {
      return {
        status: "error",
        count: 0,
        url: searchUrl,
        search_method: searchMethod,
        boundary_method: boundaryMethod,
        precision: "low",
        message: `Native search failed and no coordinates available for fallback: ${error.message}`
      };
    }
  }
}
