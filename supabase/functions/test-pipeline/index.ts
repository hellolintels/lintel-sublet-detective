
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { PostcodeResult } from './types.ts';
import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { runScrapingBeeTests } from './scrapingbee-test-runner.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🧪 Enhanced ScrapingBee API Test Pipeline");
    
    // Test postcodes for comprehensive testing
    const testPostcodes: PostcodeResult[] = [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
    
    console.log(`🎯 Running ScrapingBee tests for ${testPostcodes.length} postcodes with REST API scraping`);
    console.log(`🔍 Test Focus: ScrapingBee API reliability + multi-platform property search`);
    
    // Add coordinates to postcodes for precise search strategies
    console.log(`\n📍 Phase 0: Coordinate Lookup`);
    const postcodesWithCoordinates = await addCoordinatesToPostcodes(testPostcodes);
    
    const coordsCount = postcodesWithCoordinates.filter(p => p.latitude && p.longitude).length;
    console.log(`✅ Coordinate lookup completed: ${coordsCount}/${testPostcodes.length} postcodes have precise coordinates`);
    
    // Run ScrapingBee testing pipeline
    const scrapingBeeResults = await runScrapingBeeTests(postcodesWithCoordinates);
    
    console.log("\n🎉 ScrapingBee test pipeline completed");
    
    // Format comprehensive results
    const summary = {
      test_type: "scrapingbee_api_test",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      api_status: scrapingBeeResults.apiWorking ? "success" : "failed",
      api_service: "ScrapingBee REST API",
      coordinate_service: coordsCount > 0 
        ? `OS Places API (${coordsCount}/${testPostcodes.length} building-level coordinates) with postcodes.io fallback`
        : "postcodes.io fallback only",
      
      // API diagnostics
      api_diagnostics: {
        response_time_avg: scrapingBeeResults.avgResponseTime,
        success_rate: `${scrapingBeeResults.successfulRequests}/${scrapingBeeResults.totalRequests}`,
        rate_limit_status: scrapingBeeResults.rateLimitStatus,
        error_types: scrapingBeeResults.errorTypes
      },
      
      // Performance metrics
      performance: {
        airbnb_success_rate: `${scrapingBeeResults.testResults.filter(r => r.airbnb.status === 'investigate' || r.airbnb.count > 0).length}/${testPostcodes.length}`,
        spareroom_success_rate: `${scrapingBeeResults.testResults.filter(r => r.spareroom.status === 'investigate' || r.spareroom.count > 0).length}/${testPostcodes.length}`,
        gumtree_success_rate: `${scrapingBeeResults.testResults.filter(r => r.gumtree.status === 'investigate' || r.gumtree.count > 0).length}/${testPostcodes.length}`,
        total_matches_found: scrapingBeeResults.testResults.reduce((sum, r) => 
          sum + (r.airbnb.count || 0) + (r.spareroom.count || 0) + (r.gumtree.count || 0), 0
        ),
        average_response_time: scrapingBeeResults.avgResponseTime
      },
      
      // Recommendations
      recommendations: scrapingBeeResults.recommendations,
      overall_success: scrapingBeeResults.overallSuccess,
      
      // Detailed results
      results: scrapingBeeResults.testResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        coordinates: result.latitude && result.longitude ? 
          { lat: result.latitude, lng: result.longitude } : null,
        
        airbnb: {
          status: result.airbnb.status,
          count: result.airbnb.count,
          url: result.airbnb.url,
          response_time: result.airbnb.responseTime
        },
        spareroom: {
          status: result.spareroom.status,
          count: result.spareroom.count,
          url: result.spareroom.url,
          response_time: result.spareroom.responseTime
        },
        gumtree: {
          status: result.gumtree.status,
          count: result.gumtree.count,
          url: result.gumtree.url,
          response_time: result.gumtree.responseTime
        }
      })),
      
      // Next steps
      next_steps: scrapingBeeResults.overallSuccess 
        ? [
            "ScrapingBee API working reliably",
            "Deploy to production environment",
            "Implement result caching for performance",
            "Add request monitoring and alerts"
          ]
        : [
            "Check ScrapingBee API key configuration",
            "Verify account usage limits",
            "Test with different postcode samples",
            "Contact ScrapingBee support if issues persist"
          ]
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
    console.error('❌ ScrapingBee test pipeline error:', err);
    
    return new Response(
      JSON.stringify({
        error: "ScrapingBee test pipeline failed",
        message: err.message || 'Unknown error occurred',
        api_status: "failed",
        timestamp: new Date().toISOString(),
        recommendations: [
          "Check ScrapingBee API key configuration in Supabase secrets",
          "Verify network connectivity",
          "Check Supabase Edge Function logs for detailed error information",
          "Ensure ScrapingBee account has sufficient credits"
        ]
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
