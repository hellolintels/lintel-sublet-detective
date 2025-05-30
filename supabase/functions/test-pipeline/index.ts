
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
    
    console.log("🧪 OS Data Hub boundary-based test pipeline request received");
    
    // Test postcodes provided by user for Edinburgh and Glasgow properties
    const testPostcodes: PostcodeResult[] = [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
    
    console.log(`🔍 Testing OS Data Hub boundary-based scraping with ${testPostcodes.length} Edinburgh/Glasgow postcodes`);
    console.log(`🎯 Using official Ordnance Survey postcode boundaries for maximum accuracy`);
    
    // Add OS Data Hub boundaries to postcodes
    const postcodesWithBoundaries = await addCoordinatesToPostcodes(testPostcodes);
    
    // Test the scraping with OS boundary-based logic
    const scrapingResults = await testScrapePostcodes(postcodesWithBoundaries);
    
    console.log("✅ OS Data Hub boundary-based test scraping completed");
    
    // Format results for easy viewing
    const summary = {
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      connection_status: "success",
      boundary_service: "OS Data Hub Features API",
      search_precision: "Official OS postcode boundaries",
      improvements: "Uses official Ordnance Survey postcode polygons for precise boundary matching",
      results: scrapingResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        coordinates: result.latitude && result.longitude ? 
          { lat: result.latitude, lng: result.longitude } : null,
        boundary: result.boundary ? {
          southwest: result.boundary.southwest,
          northeast: result.boundary.northeast
        } : null,
        airbnb: {
          status: result.airbnb?.status || "unknown",
          count: result.airbnb?.count || 0,
          url: result.airbnb?.url,
          search_method: result.airbnb?.search_method || "os-boundary-precise",
          boundary_method: result.airbnb?.boundary_method || "OS Data Hub official boundary",
          precision: result.airbnb?.precision || "ultra-high",
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
    console.error('❌ OS Data Hub boundary-based test pipeline error:', err);
    
    return new Response(
      JSON.stringify({
        error: "OS Data Hub boundary-based test pipeline failed",
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
