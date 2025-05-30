
import { PostcodeResult, ScrapingResult } from './types.ts';
import { executeEnhancedWebSocketScraping } from './enhanced-websocket-handler.ts';

export async function testScrapeAirbnb(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address, latitude, longitude } = postcodeData;
  console.log(`🏠 Testing Airbnb with enhanced WebSocket connection for: ${postcode}`);
  
  // Progressive search refinement approach
  console.log(`🎯 Trying ultra-precise coordinate search first`);
  
  if (latitude && longitude) {
    console.log(`📍 Ultra-precise coordinate search: ${latitude}, ${longitude} with 20m radius and zoom=20`);
    
    const preciseUrl = `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&sw_lat=${latitude - 0.0002}&sw_lng=${longitude - 0.0002}&ne_lat=${latitude + 0.0002}&ne_lng=${longitude + 0.0002}&zoom=20&search_by_map=true`;
    
    try {
      const result = await executeEnhancedWebSocketScraping(preciseUrl, postcodeData, 'airbnb');
      
      if (result.status !== "error") {
        return {
          ...result,
          search_method: "ultra-precise-coordinates",
          precision: "ultra-high",
          radius: "20m"
        };
      }
      
      console.log(`⚠️ Precise search failed: ${result.message}`);
    } catch (error) {
      console.log(`⚠️ Precise search failed: ${error.message}`);
    }
  }
  
  // Fallback to native location search
  console.log(`🔍 Trying native location search with refinement`);
  
  const searchQueries = [
    address,
    streetName ? `${streetName}, ${postcode}` : null,
    postcode
  ].filter(Boolean);
  
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`🔍 Trying location search ${i + 1}/${searchQueries.length}: "${query}"`);
    
    try {
      const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(query)}/homes`;
      const result = await executeEnhancedWebSocketScraping(searchUrl, postcodeData, 'airbnb');
      
      if (result.status !== "error") {
        return {
          ...result,
          search_method: "native-location-search",
          precision: i === 0 ? "high" : i === 1 ? "medium" : "low"
        };
      }
    } catch (error) {
      console.log(`⚠️ Location search ${i + 1} failed: ${error.message}`);
    }
  }
  
  // Final fallback - place ID search
  console.log(`🏷️ Trying place ID search as final fallback`);
  
  try {
    console.log(`🏷️ Attempting place ID search for ${postcode}`);
    const placeUrl = `https://www.airbnb.com/s/places/${encodeURIComponent(postcode)}/homes`;
    const result = await executeEnhancedWebSocketScraping(placeUrl, postcodeData, 'airbnb');
    
    return {
      ...result,
      search_method: "place-id-search",
      precision: "low"
    };
  } catch (error) {
    console.error(`❌ All Airbnb search methods failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      search_method: "place-id-search",
      boundary_method: "all-methods-failed",
      precision: "failed",
      message: `All search methods failed: ${error.message}`
    };
  }
}
