
import { PostcodeResult, ScrapingResult } from './types.ts';
import { EnhancedScrapingBeeClient } from './enhanced-scraping-bee-client.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

export async function testScrapeAirbnbWithAccuracy(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address, latitude, longitude } = postcodeData;
  console.log(`🏠 Testing Airbnb with ScrapingBee for: ${postcode} (${latitude}, ${longitude})`);
  
  const scrapingBeeClient = new EnhancedScrapingBeeClient();
  
  try {
    // Use precise coordinate-based search when available
    let searchUrl: string;
    let searchMethod: string;
    
    if (latitude && longitude) {
      // Coordinate-based search for maximum precision
      searchUrl = `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&lat=${latitude}&lng=${longitude}&zoom=16`;
      searchMethod = "coordinate-precision";
      console.log(`📍 Using coordinate-based search: ${latitude}, ${longitude}`);
    } else if (address) {
      // Full address search
      searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(address)}/homes`;
      searchMethod = "full-address";
      console.log(`🏠 Using full address search: ${address}`);
    } else {
      // Fallback to postcode search
      const searchQuery = streetName ? `${streetName}, ${postcode}` : postcode;
      searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
      searchMethod = "postcode-fallback";
      console.log(`📮 Using postcode search: ${searchQuery}`);
    }
    
    console.log(`🔍 Airbnb ScrapingBee URL: ${searchUrl}`);
    
    // Execute scraping with ScrapingBee
    const result = await scrapingBeeClient.scrapeWithAccuracy(searchUrl, postcodeData, 'airbnb');
    
    return {
      ...result,
      search_method: searchMethod,
      precision: result.precision || "medium",
      url: searchUrl,
      listing_url: result.status === "investigate" ? HyperlinkGenerator.generateListingUrl('airbnb', postcodeData) : undefined,
      map_view_url: result.status === "no_match" ? HyperlinkGenerator.generateMapViewUrl('airbnb', postcodeData) : undefined
    };
    
  } catch (error) {
    console.error(`❌ Airbnb ScrapingBee test failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      search_method: "scrapingbee-error",
      precision: "failed",
      message: `ScrapingBee Airbnb test failed: ${error.message}`
    };
  }
}
