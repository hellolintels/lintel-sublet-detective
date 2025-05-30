import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';

interface PostcodeResult {
  postcode: string;
  address: string;
  streetName?: string;
  latitude?: number;
  longitude?: number;
}

interface CoordinateResult {
  latitude: number;
  longitude: number;
  postcode: string;
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🧪 Test pipeline request received");
    
    // Test postcodes provided by user for Edinburgh and Glasgow properties
    const testPostcodes: PostcodeResult[] = [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
    
    console.log(`🔍 Testing ultra-precise coordinate-based scraping with ${testPostcodes.length} Edinburgh/Glasgow postcodes`);
    
    // Add coordinates to postcodes
    const postcodesWithCoordinates = await addCoordinatesToPostcodes(testPostcodes);
    
    // Test the scraping with ultra-precise coordinate-based logic
    const scrapingResults = await testScrapePostcodes(postcodesWithCoordinates);
    
    console.log("✅ Test scraping completed");
    
    // Format results for easy viewing
    const summary = {
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      connection_status: "success",
      coordinate_lookup: "enabled",
      search_precision: "ultra-precise ~20m radius",
      results: scrapingResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        coordinates: result.latitude && result.longitude ? 
          { lat: result.latitude, lng: result.longitude } : null,
        airbnb: {
          status: result.airbnb?.status || "unknown",
          count: result.airbnb?.count || 0,
          url: result.airbnb?.url,
          search_method: result.airbnb?.search_method || "ultra-precise-coordinate",
          radius: result.airbnb?.radius || "~20m"
        },
        spareroom: {
          status: result.spareroom?.status || "unknown", 
          count: result.spareroom?.count || 0,
          url: result.spareroom?.url,
          search_method: result.spareroom?.search_method || "full-address"
        },
        gumtree: {
          status: result.gumtree?.status || "unknown",
          count: result.gumtree?.count || 0,
          url: result.gumtree?.url,
          search_method: result.gumtree?.search_method || "full-address"
        }
      }))
    };
    
    return new Response(
      JSON.stringify(summary, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
    
  } catch (err) {
    console.error('❌ Test pipeline error:', err);
    
    return new Response(
      JSON.stringify({
        error: "Test pipeline failed",
        message: err.message || 'Unknown error occurred',
        connection_status: "failed",
        timestamp: new Date().toISOString()
      }, null, 2),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});

async function addCoordinatesToPostcodes(postcodes: PostcodeResult[]): Promise<PostcodeResult[]> {
  console.log("🗺️ Looking up coordinates for postcodes...");
  
  const postcodesWithCoords = await Promise.all(
    postcodes.map(async (postcodeData) => {
      try {
        const coords = await lookupPostcodeCoordinates(postcodeData.postcode);
        return {
          ...postcodeData,
          latitude: coords.latitude,
          longitude: coords.longitude
        };
      } catch (error) {
        console.warn(`Could not get coordinates for ${postcodeData.postcode}:`, error.message);
        return postcodeData; // Return without coordinates
      }
    })
  );
  
  console.log(`✅ Coordinate lookup completed for ${postcodesWithCoords.length} postcodes`);
  return postcodesWithCoords;
}

async function lookupPostcodeCoordinates(postcode: string): Promise<CoordinateResult> {
  // Using postcodes.io - a free UK postcode API
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  const apiUrl = `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`;
  
  console.log(`Looking up coordinates for postcode: ${postcode}`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 200 && data.result) {
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
        postcode: data.result.postcode
      };
    } else {
      throw new Error(`Invalid response: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`Error looking up coordinates for ${postcode}:`, error);
    throw error;
  }
}

async function testScrapePostcodes(postcodes: PostcodeResult[]) {
  console.log(`Starting ultra-precise test scraping for ${postcodes.length} postcodes`);

  const results = [];
  
  for (const postcodeData of postcodes) {
    console.log(`Testing postcode: ${postcodeData.postcode} ${postcodeData.latitude && postcodeData.longitude ? `(${postcodeData.latitude}, ${postcodeData.longitude})` : '(no coordinates)'}`);
    
    try {
      const result = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        airbnb: await testScrapeAirbnb(postcodeData),
        spareroom: await testScrapeSpareRoom(postcodeData),
        gumtree: await testScrapeGumtree(postcodeData)
      };
      
      results.push(result);
    } catch (error) {
      console.error(`Error testing postcode ${postcodeData.postcode}:`, error);
      results.push({
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        airbnb: { status: "error", message: error.message },
        spareroom: { status: "error", message: error.message },
        gumtree: { status: "error", message: error.message }
      });
    }
  }

  console.log(`Ultra-precise test scraping completed for all ${postcodes.length} postcodes`);
  return results;
}

async function testScrapeAirbnb(postcodeData: PostcodeResult) {
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

async function testScrapeSpareRoom(postcodeData: PostcodeResult) {
  const { postcode, streetName, address } = postcodeData;
  console.log(`Testing SpareRoom for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search_id=&mode=list&search=${encodeURIComponent(searchQuery)}`;
  
  console.log(`Using full address search: ${searchQuery}`);
  
  // Simulated results with full address precision
  const simulatedCount = Math.floor(Math.random() * 2); // 0-1 random matches (more conservative)
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        search_method: "full-address",
        precision: "high",
        message: `Found ${simulatedCount} potential matches using full address`
      }
    : { 
        status: "no_match", 
        url: searchUrl, 
        count: 0,
        search_method: "full-address",
        precision: "high"
      };
}

async function testScrapeGumtree(postcodeData: PostcodeResult) {
  const { postcode, streetName, address } = postcodeData;
  console.log(`Testing Gumtree for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  console.log(`Using full address search: ${searchQuery}`);
  
  // Simulated results with full address precision
  const simulatedCount = Math.floor(Math.random() * 2); // 0-1 random matches (more conservative)
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        search_method: "full-address",
        precision: "high",
        message: `Found ${simulatedCount} potential matches using full address`
      }
    : { 
        status: "no_match", 
        url: searchUrl, 
        count: 0,
        search_method: "full-address",
        precision: "high"
      };
}
