
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🎯 MINIMAL G11 5AW Test Starting`);
    
    const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");
    
    if (!SCRAPINGBEE_API_KEY) {
      console.error("❌ SCRAPINGBEE_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SCRAPINGBEE_API_KEY not configured",
          message: "Please set SCRAPINGBEE_API_KEY in Supabase secrets"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`🔑 ScrapingBee API key found: ${SCRAPINGBEE_API_KEY.substring(0, 8)}...`);
    
    // Test G11 5AW - known live Airbnb listing
    const testPostcode = "G11 5AW";
    const searchUrl = `https://www.airbnb.co.uk/s/G11-5AW/homes`;
    
    console.log(`🔍 Testing postcode: ${testPostcode}`);
    console.log(`📡 Target URL: ${searchUrl}`);
    
    // Build ScrapingBee URL with minimal config
    const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=true&wait=3000`;
    
    console.log(`🚀 Making ScrapingBee request...`);
    
    const startTime = Date.now();
    const response = await fetch(scrapingBeeUrl);
    const responseTime = Date.now() - startTime;
    
    console.log(`📊 ScrapingBee response: ${response.status} ${response.statusText} (${responseTime}ms)`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ScrapingBee API error: ${errorText}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `ScrapingBee API error: ${response.status}`,
          details: errorText,
          responseTime
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const html = await response.text();
    console.log(`📄 HTML received: ${html.length} characters`);
    console.log(`📝 HTML preview (first 500 chars): ${html.substring(0, 500)}`);
    
    // Check for G11 5AW in the HTML
    const postcodeFound = html.includes("G11 5AW") || html.includes("G11") || html.includes("5AW");
    const listingsFound = html.includes("data-testid=\"card-container\"") || 
                         html.includes("listing") || 
                         html.includes("property");
    
    console.log(`🔍 Postcode check: ${postcodeFound ? "✅ FOUND" : "❌ NOT FOUND"}`);
    console.log(`🏠 Listings check: ${listingsFound ? "✅ FOUND" : "❌ NOT FOUND"}`);
    
    // Look for specific text patterns
    const hasGlasgow = html.toLowerCase().includes("glasgow");
    const hasScotland = html.toLowerCase().includes("scotland");
    const hasG11 = html.includes("G11");
    const has5AW = html.includes("5AW");
    
    console.log(`📍 Location indicators:`);
    console.log(`   Glasgow: ${hasGlasgow ? "✅" : "❌"}`);
    console.log(`   Scotland: ${hasScotland ? "✅" : "❌"}`);
    console.log(`   G11: ${hasG11 ? "✅" : "❌"}`);
    console.log(`   5AW: ${has5AW ? "✅" : "❌"}`);
    
    const success = postcodeFound || (hasG11 && has5AW);
    
    const result = {
      success,
      postcode: testPostcode,
      searchUrl,
      responseTime,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 500),
      checks: {
        postcodeFound,
        listingsFound,
        hasGlasgow,
        hasScotland,
        hasG11,
        has5AW
      },
      message: success ? 
        `✅ SUCCESS: Found G11 5AW postcode match on Airbnb` : 
        `❌ FAILED: Could not find G11 5AW in Airbnb response`,
      timestamp: new Date().toISOString()
    };
    
    console.log(`\n🎯 FINAL RESULT: ${success ? "SUCCESS" : "FAILED"}`);
    console.log(`📋 Message: ${result.message}`);
    
    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Test failed with exception",
        message: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
