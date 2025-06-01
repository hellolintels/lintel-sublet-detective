
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { detectPostcodeInHtml, detectAirbnbBlocking, detectListings } from './detection-utils.ts';
import { generateTestUrls } from './url-generator.ts';
import { makeScrapingRequest, ScrapingResult } from './scraping-client.ts';
import { analyzeResults } from './result-analyzer.ts';

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
    console.log(`🎯 ENHANCED G11 5AW Test Starting - Function Invoked Successfully`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    
    const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");
    
    if (!SCRAPINGBEE_API_KEY) {
      console.error("❌ SCRAPINGBEE_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SCRAPINGBEE_API_KEY not configured",
          message: "Please set SCRAPINGBEE_API_KEY in Supabase secrets",
          functionInvoked: true
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`🔑 ScrapingBee API key found: ${SCRAPINGBEE_API_KEY.substring(0, 8)}...`);
    
    // Test G11 5AW with multiple URL strategies
    const testPostcode = "G11 5AW";
    const testUrls = generateTestUrls(testPostcode);
    
    console.log(`🔍 Testing postcode: ${testPostcode}`);
    console.log(`📡 Testing ${testUrls.length} different URL strategies`);
    
    const results: ScrapingResult[] = [];
    
    for (let i = 0; i < testUrls.length; i++) {
      const searchUrl = testUrls[i];
      
      // Make scraping request
      const result = await makeScrapingRequest(searchUrl, i, SCRAPINGBEE_API_KEY);
      
      if (result.success && result.htmlPreview) {
        // Enhanced postcode detection based on manus.ai recommendations
        const postcodeDetection = detectPostcodeInHtml(result.htmlPreview, testPostcode);
        console.log(`🔍 Strategy ${i + 1} Postcode Detection Results:`, postcodeDetection);
        
        // Check for Airbnb anti-bot detection
        const antiBot = detectAirbnbBlocking(result.htmlPreview);
        console.log(`🛡️ Strategy ${i + 1} Anti-bot detection:`, antiBot);
        
        // Look for listings
        const listingsFound = detectListings(result.htmlPreview);
        console.log(`🏠 Strategy ${i + 1} Listings detected: ${listingsFound.count} listings found`);
        
        // Add analysis results to the result
        result.postcodeDetection = postcodeDetection;
        result.antiBot = antiBot;
        result.listingsFound = listingsFound;
        result.message = postcodeDetection.found ? 
          `✅ SUCCESS: Found G11 5AW postcode using strategy ${i + 1}` : 
          `❌ No postcode match found using strategy ${i + 1}`;
      }
      
      results.push(result);
      
      // If we found a match, we can break early
      if (result.postcodeDetection?.found) {
        console.log(`🎉 EARLY SUCCESS: Strategy ${i + 1} found the postcode!`);
        break;
      }
      
      // Add delay between requests to be respectful
      if (i < testUrls.length - 1) {
        console.log(`⏳ Waiting 2 seconds before next strategy...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Analyze overall results
    const finalResult = analyzeResults(results, testPostcode);
    
    console.log(`\n🎯 FINAL ENHANCED RESULT: ${finalResult.success ? "SUCCESS" : "FAILED"}`);
    console.log(`📋 Message: ${finalResult.message}`);
    console.log(`📊 Summary:`, finalResult.summary);
    console.log(`💳 Credits used: ${finalResult.creditsUsed}`);
    
    return new Response(
      JSON.stringify(finalResult, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error('❌ Enhanced test failed with error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Enhanced test failed with exception",
        message: error.message || 'Unknown error occurred',
        functionInvoked: true,
        timestamp: new Date().toISOString(),
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
