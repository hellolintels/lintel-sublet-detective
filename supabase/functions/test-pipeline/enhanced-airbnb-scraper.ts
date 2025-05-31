
import { PostcodeResult, ScrapingResult } from './types.ts';
import { executeEnhancedWebSocketScraping } from './enhanced-websocket-handler.ts';
import { EnhancedHTMLAnalyzer } from './enhanced-html-analyzer.ts';

export async function testScrapeAirbnbWithAccuracy(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address, latitude, longitude } = postcodeData;
  console.log(`🏠 Testing Airbnb with enhanced accuracy for: ${postcode} (${latitude}, ${longitude})`);
  
  const analyzer = new EnhancedHTMLAnalyzer();
  
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
    
    console.log(`🔍 Airbnb search URL: ${searchUrl}`);
    
    // Execute scraping with enhanced configuration
    const scrapingResult = await executeEnhancedWebSocketScraping(searchUrl, postcodeData, 'airbnb');
    
    // If we got HTML content, analyze it for accuracy
    if (scrapingResult.status !== "error" && scrapingResult.html) {
      console.log(`📄 Analyzing ${scrapingResult.html.length} characters of HTML for accuracy`);
      
      const accurateResult = analyzer.analyzeForAccurateVerificationLinks(
        scrapingResult.html,
        postcodeData,
        'airbnb',
        searchUrl
      );
      
      return {
        ...accurateResult,
        search_method: searchMethod,
        precision: accurateResult.accuracy || "medium",
        boundary_method: latitude && longitude ? "coordinate-based" : "postcode-based",
        url: searchUrl,
        credit_cost: scrapingResult.creditCost || 25
      };
    }
    
    // Fallback if scraping failed
    return {
      status: "error",
      count: 0,
      search_method: searchMethod,
      precision: "failed",
      boundary_method: "enhanced-websocket-failed",
      message: `Airbnb enhanced scraping failed: ${scrapingResult.message}`,
      url: searchUrl
    };
    
  } catch (error) {
    console.error(`❌ Airbnb enhanced accuracy test failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      search_method: "unknown",
      precision: "failed",
      boundary_method: "error",
      message: `Enhanced Airbnb test failed: ${error.message}`
    };
  }
}
