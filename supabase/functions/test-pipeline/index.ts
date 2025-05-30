
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { scrapePostcodes } from '../process-addresses/scraping/bright-data-scraper.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🧪 Test pipeline request received");
    
    // Simple test postcodes for UK property matching
    const testPostcodes = [
      { postcode: "E1 6AN", address: "5 Commercial Street, London E1 6AN", streetName: "Commercial Street" },
      { postcode: "SW1A 1AA", address: "Buckingham Palace, London SW1A 1AA", streetName: "Buckingham Palace" },
      { postcode: "M1 1AE", address: "1 Corporation Street, Manchester M1 1AE", streetName: "Corporation Street" },
      { postcode: "B1 1HH", address: "2 Temple Row, Birmingham B1 1HH", streetName: "Temple Row" },
      { postcode: "LS1 4DY", address: "The Headrow, Leeds LS1 4DY", streetName: "The Headrow" }
    ];
    
    console.log(`🔍 Testing Bright Data scraping with ${testPostcodes.length} postcodes`);
    
    // Test the Bright Data scraping directly
    const scrapingResults = await scrapePostcodes(testPostcodes);
    
    console.log("✅ Test scraping completed");
    
    // Format results for easy viewing
    const summary = {
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      bright_data_connection: "success",
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
        bright_data_connection: "failed",
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
