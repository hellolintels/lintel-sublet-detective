
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
    const testUrls = [
      `https://www.airbnb.co.uk/s/G11-5AW/homes`,
      `https://www.airbnb.co.uk/s/Glasgow/homes?query=G11%205AW`,
      `https://www.airbnb.co.uk/s/Glasgow--United-Kingdom/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&query=G11%205AW`
    ];
    
    console.log(`🔍 Testing postcode: ${testPostcode}`);
    console.log(`📡 Testing ${testUrls.length} different URL strategies`);
    
    const results = [];
    
    for (let i = 0; i < testUrls.length; i++) {
      const searchUrl = testUrls[i];
      console.log(`\n🚀 Strategy ${i + 1}: ${searchUrl}`);
      
      // Enhanced ScrapingBee parameters based on manus.ai recommendations
      const params = new URLSearchParams({
        api_key: SCRAPINGBEE_API_KEY,
        url: searchUrl,
        render_js: 'true',
        wait: '5000',
        premium_proxy: 'true',
        country_code: 'gb',
        forward_headers: 'true'
      });
      
      const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;
      
      console.log(`📊 ScrapingBee URL parameters:`, {
        render_js: true,
        wait: 5000,
        premium_proxy: true,
        country_code: 'gb',
        forward_headers: true
      });
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(scrapingBeeUrl);
        const responseTime = Date.now() - startTime;
        
        console.log(`📊 Strategy ${i + 1} Response: ${response.status} ${response.statusText} (${responseTime}ms)`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Strategy ${i + 1} ScrapingBee API error: ${errorText}`);
          
          results.push({
            strategy: i + 1,
            url: searchUrl,
            success: false,
            error: `ScrapingBee API error: ${response.status}`,
            details: errorText,
            responseTime
          });
          continue;
        }
        
        const html = await response.text();
        console.log(`📄 Strategy ${i + 1} HTML received: ${html.length} characters`);
        console.log(`📝 Strategy ${i + 1} HTML preview (first 2000 chars): ${html.substring(0, 2000)}`);
        
        // Enhanced postcode detection based on manus.ai recommendations
        const postcodeDetection = detectPostcodeInHtml(html, testPostcode);
        
        console.log(`🔍 Strategy ${i + 1} Postcode Detection Results:`, postcodeDetection);
        
        // Check for Airbnb anti-bot detection
        const antiBot = detectAirbnbBlocking(html);
        console.log(`🛡️ Strategy ${i + 1} Anti-bot detection:`, antiBot);
        
        // Look for listings
        const listingsFound = detectListings(html);
        console.log(`🏠 Strategy ${i + 1} Listings detected: ${listingsFound.count} listings found`);
        
        results.push({
          strategy: i + 1,
          url: searchUrl,
          success: true,
          responseTime,
          htmlLength: html.length,
          htmlPreview: html.substring(0, 2000),
          postcodeDetection,
          antiBot,
          listingsFound,
          message: postcodeDetection.found ? 
            `✅ SUCCESS: Found G11 5AW postcode using strategy ${i + 1}` : 
            `❌ No postcode match found using strategy ${i + 1}`
        });
        
        // If we found a match, we can break early
        if (postcodeDetection.found) {
          console.log(`🎉 EARLY SUCCESS: Strategy ${i + 1} found the postcode!`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Strategy ${i + 1} fetch error:`, error);
        results.push({
          strategy: i + 1,
          url: searchUrl,
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });
      }
      
      // Add delay between requests to be respectful
      if (i < testUrls.length - 1) {
        console.log(`⏳ Waiting 2 seconds before next strategy...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Analyze overall results
    const successfulResults = results.filter(r => r.success);
    const postcodeMatches = results.filter(r => r.success && r.postcodeDetection?.found);
    const totalCreditsUsed = results.length; // Each request uses 1 credit
    
    const finalResult = {
      success: postcodeMatches.length > 0,
      postcode: testPostcode,
      strategiesTested: results.length,
      successfulRequests: successfulResults.length,
      postcodeMatchesFound: postcodeMatches.length,
      creditsUsed: totalCreditsUsed,
      functionInvoked: true,
      timestamp: new Date().toISOString(),
      
      // Best result (first successful match or best attempt)
      bestResult: postcodeMatches.length > 0 ? postcodeMatches[0] : successfulResults[0] || results[0],
      
      // All results for detailed analysis
      allResults: results,
      
      message: postcodeMatches.length > 0 ? 
        `✅ SUCCESS: Found G11 5AW using ${postcodeMatches.length} of ${results.length} strategies` : 
        `❌ FAILED: No postcode matches found in ${results.length} strategies (${successfulResults.length} successful requests)`,
      
      // Summary for debugging
      summary: {
        totalStrategies: results.length,
        successfulRequests: successfulResults.length,
        postcodeMatches: postcodeMatches.length,
        averageResponseTime: successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / Math.max(successfulResults.length, 1),
        totalHtmlReceived: successfulResults.reduce((sum, r) => sum + (r.htmlLength || 0), 0)
      }
    };
    
    console.log(`\n🎯 FINAL ENHANCED RESULT: ${finalResult.success ? "SUCCESS" : "FAILED"}`);
    console.log(`📋 Message: ${finalResult.message}`);
    console.log(`📊 Summary:`, finalResult.summary);
    console.log(`💳 Credits used: ${totalCreditsUsed}`);
    
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

// Enhanced postcode detection function
function detectPostcodeInHtml(html: string, postcode: string) {
  const lowerHtml = html.toLowerCase();
  const lowerPostcode = postcode.toLowerCase();
  
  // Direct match
  if (html.includes(postcode)) {
    return { found: true, method: 'exact_match', confidence: 1.0 };
  }
  
  // Case insensitive match
  if (lowerHtml.includes(lowerPostcode)) {
    return { found: true, method: 'case_insensitive', confidence: 0.9 };
  }
  
  // Split postcode parts (e.g., "G11" and "5AW")
  const parts = postcode.split(' ');
  if (parts.length === 2) {
    const part1Found = html.includes(parts[0]);
    const part2Found = html.includes(parts[1]);
    
    if (part1Found && part2Found) {
      return { found: true, method: 'split_parts', confidence: 0.8, parts: { part1: part1Found, part2: part2Found } };
    }
  }
  
  // URL-encoded version
  const encoded = encodeURIComponent(postcode);
  if (html.includes(encoded)) {
    return { found: true, method: 'url_encoded', confidence: 0.7 };
  }
  
  // No spaces version (G115AW)
  const noSpaces = postcode.replace(/\s+/g, '');
  if (html.includes(noSpaces)) {
    return { found: true, method: 'no_spaces', confidence: 0.6 };
  }
  
  // Hyphenated version (G11-5AW)
  const hyphenated = postcode.replace(/\s+/g, '-');
  if (html.includes(hyphenated)) {
    return { found: true, method: 'hyphenated', confidence: 0.7 };
  }
  
  return { found: false, method: 'none', confidence: 0.0 };
}

// Detect Airbnb anti-bot measures
function detectAirbnbBlocking(html: string) {
  const blockingPatterns = [
    'Please verify you are a human',
    'Access to this page has been denied',
    'captcha',
    'challenge-platform',
    'blocked',
    'unusual traffic',
    'robot'
  ];
  
  const lowerHtml = html.toLowerCase();
  const detectedPatterns = blockingPatterns.filter(pattern => lowerHtml.includes(pattern.toLowerCase()));
  
  return {
    blocked: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    confidence: detectedPatterns.length > 0 ? Math.min(detectedPatterns.length / blockingPatterns.length, 1.0) : 0.0
  };
}

// Detect listings in HTML
function detectListings(html: string) {
  const listingSelectors = [
    'data-testid="card-container"',
    'data-testid="listing-card"',
    'div.lxq01kf',
    '.t1jojoys',
    'listing',
    'property'
  ];
  
  let totalCount = 0;
  const foundSelectors = [];
  
  for (const selector of listingSelectors) {
    const regex = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (html.match(regex) || []).length;
    if (matches > 0) {
      totalCount += matches;
      foundSelectors.push({ selector, count: matches });
    }
  }
  
  return {
    count: totalCount,
    foundSelectors,
    hasListings: totalCount > 0
  };
}
