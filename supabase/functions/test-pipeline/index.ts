
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { PostcodeResult } from './types.ts';
import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { runEnhancedTests } from './enhanced-test-runner.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🧪 Enhanced Airbnb WebSocket Connection & Scraping Test Pipeline");
    
    // Test postcodes for comprehensive testing
    const testPostcodes: PostcodeResult[] = [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
    
    console.log(`🎯 Running enhanced tests for ${testPostcodes.length} postcodes with multi-strategy Airbnb scraping`);
    console.log(`🔍 Test Focus: WebSocket connection resolution + Airbnb search strategy optimization`);
    
    // Add coordinates to postcodes for precise search strategies
    console.log(`\n📍 Phase 0: Coordinate Lookup`);
    const postcodesWithCoordinates = await addCoordinatesToPostcodes(testPostcodes);
    
    const coordsCount = postcodesWithCoordinates.filter(p => p.latitude && p.longitude).length;
    console.log(`✅ Coordinate lookup completed: ${coordsCount}/${testPostcodes.length} postcodes have precise coordinates`);
    
    // Run enhanced testing pipeline
    const enhancedResults = await runEnhancedTests(postcodesWithCoordinates);
    
    console.log("\n🎉 Enhanced test pipeline completed");
    
    // Format comprehensive results
    const summary = {
      test_type: "enhanced_airbnb_websocket_test",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      connection_status: enhancedResults.workingEndpoint ? "success" : "failed",
      working_endpoint: enhancedResults.workingEndpoint,
      coordinate_service: coordsCount > 0 
        ? `OS Places API (${coordsCount}/${testPostcodes.length} building-level coordinates) with postcodes.io fallback`
        : "postcodes.io fallback only",
      
      // Connection diagnostics
      connection_diagnostics: enhancedResults.connectionDiagnostics.map(diag => ({
        port: diag.port,
        success: diag.success,
        response_time_ms: diag.responseTime,
        error_type: diag.errorType,
        details: diag.details
      })),
      connection_summary: enhancedResults.connectionSummary,
      
      // Performance metrics
      performance: {
        airbnb_success_rate: `${enhancedResults.testResults.filter(r => r.airbnb.status === 'investigate' || r.airbnb.count > 0).length}/${testPostcodes.length}`,
        total_matches_found: enhancedResults.testResults.reduce((sum, r) => sum + r.airbnb.count, 0),
        average_response_time: enhancedResults.connectionDiagnostics
          .filter(d => d.success && d.responseTime)
          .reduce((sum, d) => sum + (d.responseTime || 0), 0) / 
          enhancedResults.connectionDiagnostics.filter(d => d.success).length || 0
      },
      
      // Recommendations
      recommendations: enhancedResults.recommendations,
      overall_success: enhancedResults.overallSuccess,
      
      // Detailed results
      results: enhancedResults.testResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        coordinates: result.latitude && result.longitude ? 
          { lat: result.latitude, lng: result.longitude } : null,
        
        airbnb: {
          status: result.airbnb.status,
          count: result.airbnb.count,
          total_found: result.airbnb.totalFound,
          search_method: result.airbnb.search_method,
          precision: result.airbnb.precision,
          message: result.airbnb.message,
          url: result.airbnb.url
        }
      })),
      
      // Next steps
      next_steps: enhancedResults.overallSuccess 
        ? [
            "Implement SpareRoom scraper with similar multi-strategy approach",
            "Add Gumtree scraper functionality", 
            "Optimize performance and add concurrent scraping",
            "Implement result caching and rate limiting"
          ]
        : [
            "Fix WebSocket connection issues first",
            "Debug Airbnb scraping problems",
            "Verify Bright Data configuration",
            "Test with different postcode samples"
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
    console.error('❌ Enhanced test pipeline error:', err);
    
    return new Response(
      JSON.stringify({
        error: "Enhanced test pipeline failed",
        message: err.message || 'Unknown error occurred',
        connection_status: "failed",
        timestamp: new Date().toISOString(),
        recommendations: [
          "Check Bright Data WebSocket endpoint configuration",
          "Verify network connectivity",
          "Check Supabase Edge Function logs for detailed error information"
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
