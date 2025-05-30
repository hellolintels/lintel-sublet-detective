
import { PostcodeResult, ScrapingResult } from './types.ts';
import { executeWebSocketScraping } from './websocket-handler.ts';

export async function testScrapeAirbnb(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, latitude, longitude, address } = postcodeData;
  console.log(`🏠 Testing Airbnb with progressive search refinement for: ${postcode}`);
  
  // Strategy 1: Ultra-precise coordinate search with postcode-level zoom
  if (latitude && longitude) {
    console.log(`🎯 Trying ultra-precise coordinate search first`);
    const preciseResult = await tryPreciseCoordinateSearch(postcodeData);
    
    if (preciseResult.status !== "too_broad" && preciseResult.status !== "error") {
      return preciseResult;
    }
    
    console.log(`⚠️ Precise search failed: ${preciseResult.message}`);
  }
  
  // Strategy 2: Native location search with progressive refinement
  console.log(`🔍 Trying native location search with refinement`);
  const locationResult = await tryProgressiveLocationSearch(postcodeData);
  
  if (locationResult.status !== "too_broad" && locationResult.status !== "error") {
    return locationResult;
  }
  
  // Strategy 3: Place ID search (if we can implement it)
  console.log(`🏷️ Trying place ID search as final fallback`);
  return await tryPlaceIdSearch(postcodeData);
}

async function tryPreciseCoordinateSearch(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, latitude, longitude } = postcodeData;
  
  // Use very small radius for postcode-level precision
  const precision = 0.0002; // ~20m radius for ultra-precise search
  const swLat = latitude! - precision;
  const swLng = longitude! - precision; 
  const neLat = latitude! + precision;
  const neLng = longitude! + precision;
  
  // Force maximum zoom for postcode-level view
  const searchUrl = `https://www.airbnb.com/s/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}&zoom=20&center_lat=${latitude}&center_lng=${longitude}&search_type=pagination`;
  
  console.log(`📍 Ultra-precise coordinate search: ${latitude}, ${longitude} with 20m radius and zoom=20`);
  
  try {
    const result = await executeWebSocketScraping(searchUrl, postcodeData, 'airbnb');
    return {
      ...result,
      search_method: "ultra-precise-coordinates",
      boundary_method: "20m radius with zoom=20",
      precision: result.status === "too_broad" ? "insufficient" : "very-high"
    };
  } catch (error) {
    console.error(`❌ Ultra-precise coordinate search failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: searchUrl,
      search_method: "ultra-precise-coordinates",
      boundary_method: "20m radius with zoom=20",
      precision: "failed",
      message: `Ultra-precise search failed: ${error.message}`
    };
  }
}

async function tryProgressiveLocationSearch(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  
  // Try different search queries in order of specificity
  const searchQueries = [
    // Most specific: full address if available
    address,
    // Medium: street + postcode
    streetName ? `${streetName}, ${postcode}` : null,
    // Least specific: postcode only
    postcode
  ].filter(Boolean);
  
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`🔍 Trying location search ${i + 1}/${searchQueries.length}: "${query}"`);
    
    // Add parameters to force precise map view
    const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(query!)}/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2024-06-01&monthly_length=3&price_filter_input_type=0&search_type=filter_change&zoom=18`;
    
    try {
      const result = await executeWebSocketScraping(searchUrl, postcodeData, 'airbnb');
      
      // If we get "too_broad", try next query
      if (result.status === "too_broad") {
        console.log(`⚠️ Query "${query}" too broad, trying more specific search`);
        continue;
      }
      
      // If we get results or no_match (but not too_broad), return it
      if (result.status !== "error") {
        return {
          ...result,
          search_method: "progressive-location-search",
          boundary_method: `Native location search: "${query}" with zoom=18`,
          precision: result.status === "investigate" ? "high" : "medium"
        };
      }
      
    } catch (error) {
      console.error(`❌ Location search failed for query "${query}":`, error);
      continue;
    }
  }
  
  return {
    status: "error",
    count: 0,
    url: "",
    search_method: "progressive-location-search",
    boundary_method: "all queries failed",
    precision: "failed",
    message: "All progressive location searches failed"
  };
}

async function tryPlaceIdSearch(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode } = postcodeData;
  
  console.log(`🏷️ Attempting place ID search for ${postcode}`);
  
  // First, try to get place ID by searching for the postcode
  const placeSearchUrl = `https://www.airbnb.com/api/v3/StaysSearch?operationName=StaysSearch&locale=en&currency=GBP&variables=%7B%22request%22%3A%7B%22metadataOnly%22%3Afalse%2C%22version%22%3A%221.8.3%22%2C%22tabId%22%3A%22home_tab%22%2C%22refinementPaths%22%3A%5B%22%2Fhomes%22%5D%2C%22source%22%3A%22structured_search_input_header%22%2C%22searchType%22%3A%22pagination%22%2C%22neLat%22%3A90%2C%22neLng%22%3A180%2C%22swLat%22%3A-90%2C%22swLng%22%3A-180%2C%22zoom%22%3A20%2C%22query%22%3A%22${encodeURIComponent(postcode)}%22%7D%7D`;
  
  try {
    const result = await executeWebSocketScraping(placeSearchUrl, postcodeData, 'airbnb');
    return {
      ...result,
      search_method: "place-id-search",
      boundary_method: "API search with place ID",
      precision: result.status === "investigate" ? "high" : "medium"
    };
  } catch (error) {
    console.error(`❌ Place ID search failed for ${postcode}:`, error);
    return {
      status: "error",
      count: 0,
      url: placeSearchUrl,
      search_method: "place-id-search",
      boundary_method: "API search with place ID",
      precision: "failed",
      message: `Place ID search failed: ${error.message}`
    };
  }
}
