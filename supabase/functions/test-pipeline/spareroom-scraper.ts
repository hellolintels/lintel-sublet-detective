
import { PostcodeResult, ScrapingResult } from './types.ts';
import { executeEnhancedWebSocketScraping } from './enhanced-websocket-handler.ts';

export async function testScrapeSpareRoom(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  console.log(`🏠 Testing SpareRoom with enhanced WebSocket for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search_id=&mode=list&search=${encodeURIComponent(searchQuery)}`;
  
  console.log(`🔍 Using full address search: ${searchQuery}`);
  
  try {
    const result = await executeEnhancedWebSocketScraping(searchUrl, postcodeData, 'spareroom');
    return {
      ...result,
      search_method: "full-address",
      precision: "high"
    };
  } catch (error) {
    console.error(`❌ SpareRoom enhanced scraping failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: searchUrl,
      search_method: "full-address",
      boundary_method: "enhanced-websocket-failed",
      precision: "failed",
      message: `SpareRoom enhanced scraping failed: ${error.message}`
    };
  }
}
