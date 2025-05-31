
import { PostcodeResult, ScrapingResult } from './types.ts';
import { EnhancedScrapingBeeClient } from './enhanced-scraping-bee-client.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

export async function testScrapeGumtree(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  console.log(`🏠 Testing Gumtree with ScrapingBee for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const scrapingBeeClient = new EnhancedScrapingBeeClient();
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  console.log(`🔍 Using full address search: ${searchQuery}`);
  console.log(`🔍 Gumtree ScrapingBee URL: ${searchUrl}`);
  
  try {
    const result = await scrapingBeeClient.scrapeWithAccuracy(searchUrl, postcodeData, 'gumtree');
    
    return {
      ...result,
      search_method: "full-address",
      precision: result.precision || "high",
      url: searchUrl,
      listing_url: result.status === "investigate" ? HyperlinkGenerator.generateListingUrl('gumtree', postcodeData) : undefined,
      map_view_url: result.status === "no_match" ? HyperlinkGenerator.generateMapViewUrl('gumtree', postcodeData) : undefined
    };
  } catch (error) {
    console.error(`❌ Gumtree ScrapingBee failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: searchUrl,
      search_method: "scrapingbee-error",
      precision: "failed",
      message: `Gumtree ScrapingBee failed: ${error.message}`
    };
  }
}
