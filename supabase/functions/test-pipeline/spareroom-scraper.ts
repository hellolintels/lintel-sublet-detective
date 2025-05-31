
import { PostcodeResult, ScrapingResult } from './types.ts';
import { EnhancedScrapingBeeClient } from './enhanced-scraping-bee-client.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

export async function testScrapeSpareRoom(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  console.log(`🏠 Testing SpareRoom with ScrapingBee for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const scrapingBeeClient = new EnhancedScrapingBeeClient();
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(searchQuery)}`;
  
  console.log(`🔍 Using full address search: ${searchQuery}`);
  console.log(`🔍 SpareRoom ScrapingBee URL: ${searchUrl}`);
  
  try {
    const result = await scrapingBeeClient.scrapeWithAccuracy(searchUrl, postcodeData, 'spareroom');
    
    return {
      ...result,
      search_method: "full-address",
      precision: result.precision || "high",
      url: searchUrl,
      listing_url: result.status === "investigate" ? HyperlinkGenerator.generateListingUrl('spareroom', postcodeData) : undefined,
      map_view_url: result.status === "no_match" ? HyperlinkGenerator.generateMapViewUrl('spareroom', postcodeData) : undefined
    };
  } catch (error) {
    console.error(`❌ SpareRoom ScrapingBee failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: searchUrl,
      search_method: "scrapingbee-error",
      precision: "failed",
      message: `SpareRoom ScrapingBee failed: ${error.message}`
    };
  }
}
