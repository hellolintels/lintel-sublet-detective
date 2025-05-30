
import { WebSocketScrapingResult } from './websocket-types.ts';

export function processScrapingResult(data: any, postcodeData: any, platform: string, url: string): WebSocketScrapingResult {
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
