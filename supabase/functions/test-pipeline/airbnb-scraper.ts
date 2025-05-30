
import { PostcodeResult, ScrapingResult } from './types.ts';

export async function testScrapeAirbnb(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, latitude, longitude, address } = postcodeData;
  console.log(`Testing Airbnb with ultra-precise coordinates for: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  let searchUrl: string;
  let searchMethod: string;
  let radius: string;
  
  if (latitude && longitude) {
    // Use ultra-precise coordinate-based search with very tight radius (~20m = 0.0002 degrees)
    const precision = 0.0002; // ~20 meter radius for ultra-precise targeting
    const swLat = latitude - precision;
    const swLng = longitude - precision; 
    const neLat = latitude + precision;
    const neLng = longitude + precision;
    
    // Add zoom parameter for tighter map view (zoom=17 shows individual buildings)
    searchUrl = `https://www.airbnb.com/s/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2024-02-01&monthly_length=3&price_filter_input_type=0&channel=EXPLORE&search_type=autocomplete_click&place_id=ChIJX6QWE6w7h0gR0bN8-YJNFaM&sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}&zoom=17`;
    searchMethod = "ultra-precise-coordinate";
    radius = "~20m";
    console.log(`Using ultra-precise coordinate search: ${latitude}, ${longitude} with ~20m radius (±${precision} degrees)`);
  } else {
    // Fallback to full address search
    const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
    searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
    searchMethod = "full-address-fallback";
    radius = "unknown";
    console.log(`Using address search fallback: ${searchQuery}`);
  }
  
  // For testing, return simulated results with ultra-precise targeting
  const simulatedCount = Math.floor(Math.random() * 2); // 0-1 random matches (very conservative for tight radius)
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        search_method: searchMethod,
        radius: radius,
        precision: latitude && longitude ? "ultra-high" : "medium",
        message: `Found ${simulatedCount} potential matches using ${searchMethod} with ${radius} radius`
      }
    : { 
        status: "no_match", 
        url: searchUrl, 
        count: 0, 
        search_method: searchMethod,
        radius: radius,
        precision: latitude && longitude ? "ultra-high" : "medium"
      };
}
