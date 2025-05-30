
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { PostcodeResult } from './types.ts';
import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { testScrapePostcodes } from './test-runner.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🧪 Postcode-focused test pipeline request received");
    
    // Test postcodes provided by user for Edinburgh and Glasgow properties
    const testPostcodes: PostcodeResult[] = [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
    
    console.log(`🔍 Testing postcode-area focused scraping with ${testPostcodes.length} Edinburgh/Glasgow postcodes`);
    console.log(`🎯 Optimized for G11 5AW to capture known live listing within postcode boundary`);
    
    // Add coordinates to postcodes
    const postcodesWithCoordinates = await addCoordinatesToPostcodes(testPostcodes);
    
    // Test the scraping with postcode-area focused logic
    const scrapingResults = await testScrapePostcodes(postcodesWithCoordinates);
    
    console.log("✅ Postcode-focused test scraping completed");
    
    // Format results for easy viewing
    const summary = {
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      connection_status: "success",
      coordinate_lookup: "enabled",
      search_precision: "postcode-area focused ~300-400m radius",
      improvements: "Focused on postcode boundaries with live listing validation",
      results: scrapingResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        coordinates: result.latitude && result.longitude ? 
          { lat: result.latitude, lng: result.longitude } : null,
        airbnb: {
          status: result.airbnb?.status || "unknown",
          count: result.airbnb?.count || 0,
          url: result.airbnb?.url,
          search_method: result.airbnb?.search_method || "postcode-area-focused",
          radius: result.airbnb?.radius || "~300m",
          message: result.airbnb?.message
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
    console.error('❌ Postcode-focused test pipeline error:', err);
    
    return new Response(
      JSON.stringify({
        error: "Postcode-focused test pipeline failed",
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
