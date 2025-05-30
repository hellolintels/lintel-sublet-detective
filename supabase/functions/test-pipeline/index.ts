
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';

interface PostcodeResult {
  postcode: string;
  address: string;
  streetName?: string;
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
    
    console.log(`🔍 Testing scraping with ${testPostcodes.length} Edinburgh/Glasgow postcodes`);
    
    // Test the scraping directly with simplified logic
    const scrapingResults = await testScrapePostcodes(testPostcodes);
    
    console.log("✅ Test scraping completed");
    
    // Format results for easy viewing
    const summary = {
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      connection_status: "success",
      results: scrapingResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        airbnb: {
          status: result.airbnb?.status || "unknown",
          count: result.airbnb?.count || 0,
          url: result.airbnb?.url
        },
        spareroom: {
          status: result.spareroom?.status || "unknown", 
          count: result.spareroom?.count || 0,
          url: result.spareroom?.url
        },
        gumtree: {
          status: result.gumtree?.status || "unknown",
          count: result.gumtree?.count || 0,
          url: result.gumtree?.url
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

async function testScrapePostcodes(postcodes: PostcodeResult[]) {
  console.log(`Starting test scraping for ${postcodes.length} postcodes`);

  const results = [];
  
  for (const postcodeData of postcodes) {
    console.log(`Testing postcode: ${postcodeData.postcode}`);
    
    try {
      // Simulate scraping with test data - replace with actual scraping later
      const result = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
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
        airbnb: { status: "error", message: error.message },
        spareroom: { status: "error", message: error.message },
        gumtree: { status: "error", message: error.message }
      });
    }
  }

  console.log(`Test scraping completed for all ${postcodes.length} postcodes`);
  return results;
}

async function testScrapeAirbnb(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`Testing Airbnb for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
  
  // For now, return simulated results - this can be replaced with actual scraping
  // This allows testing the full pipeline without implementing full scraping yet
  const simulatedCount = Math.floor(Math.random() * 5); // 0-4 random matches
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        message: `Found ${simulatedCount} potential matches`
      }
    : { status: "no_match", url: searchUrl, count: 0 };
}

async function testScrapeSpareRoom(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`Testing SpareRoom for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search_id=&mode=list&search=${encodeURIComponent(searchQuery)}`;
  
  // Simulated results
  const simulatedCount = Math.floor(Math.random() * 3); // 0-2 random matches
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        message: `Found ${simulatedCount} potential matches`
      }
    : { status: "no_match", url: searchUrl, count: 0 };
}

async function testScrapeGumtree(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`Testing Gumtree for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  // Simulated results
  const simulatedCount = Math.floor(Math.random() * 4); // 0-3 random matches
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        message: `Found ${simulatedCount} potential matches`
      }
    : { status: "no_match", url: searchUrl, count: 0 };
}
