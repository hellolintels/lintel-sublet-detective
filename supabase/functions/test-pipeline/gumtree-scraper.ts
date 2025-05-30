
import { PostcodeResult, ScrapingResult } from './types.ts';
import { executeEnhancedWebSocketScraping } from './enhanced-websocket-handler.ts';

export async function testScrapeGumtree(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  console.log(`🏠 Testing Gumtree with enhanced WebSocket for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  console.log(`🔍 Using full address search: ${searchQuery}`);
  
  try {
    const result = await executeEnhancedWebSocketScraping(searchUrl, postcodeData, 'gumtree');
    return {
      ...result,
      search_method: "full-address",
      precision: "high"
    };
  } catch (error) {
    console.error(`❌ Gumtree enhanced scraping failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: searchUrl,
      search_method: "full-address",
      boundary_method: "enhanced-websocket-failed",
      precision: "failed",
      message: `Gumtree enhanced scraping failed: ${error.message}`
    };
  }
}
