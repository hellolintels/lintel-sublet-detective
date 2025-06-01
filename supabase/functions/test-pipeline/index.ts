
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { TestPostcodeProvider } from './test-postcode-provider.ts';
import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { EnhancedTestOrchestrator } from './enhanced-test-orchestrator.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log(`🎯 MANUS.AI EXACT POSTCODE VALIDATION Pipeline Starting`);
    console.log(`🔍 Binary classification: INVESTIGATE (exact match) or NO_MATCH only`);
    console.log(`❌ Zero false positives through exact postcode validation`);
    
    // Get test postcodes
    const testPostcodes = TestPostcodeProvider.getTestPostcodes();
    console.log(`📍 Testing ${testPostcodes.length} postcodes with exact validation`);
    
    // Add coordinates for precision
    const postcodesWithCoords = await addCoordinatesToPostcodes(testPostcodes);
    const coordsCount = postcodesWithCoords.filter(p => p.latitude && p.longitude).length;
    console.log(`📍 Coordinate enhancement: ${coordsCount}/${testPostcodes.length} postcodes now have precise coordinates`);
    
    // Run exact postcode validation pipeline
    const orchestrator = new EnhancedTestOrchestrator();
    const { results, summary } = await orchestrator.runEnhancedTestPipeline(postcodesWithCoords);
    
    // Count exact matches for reporting
    const exactMatches = results.reduce((count, result) => {
      if (result.airbnb?.status === "investigate") count++;
      if (result.spareroom?.status === "investigate") count++;
      if (result.gumtree?.status === "investigate") count++;
      return count;
    }, 0);
    
    // Format final response
    const response = {
      test_type: "Manus.ai Exact Postcode Validation",
      methodology: "Binary classification with exact postcode matching",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      api_status: "success",
      validation_system: "Exact postcode normalization + DOM extraction",
      search_precision: "Postcode/Coordinate Level with Zero False Positives",
      
      coordinate_precision: `${coordsCount}/${testPostcodes.length} postcodes with precise coordinates`,
      
      exact_match_results: {
        total_exact_matches: exactMatches,
        false_positive_rate: "0% (by design)",
        validation_method: "Normalized postcode comparison"
      },
      
      summary,
      
      overall_success: summary.success_rate >= 70,
      results: results,
      
      extraction_monitoring: {
        dom_extraction_enabled: true,
        platform_specific_selectors: true,
        scrapingbee_wait_for_optimization: true,
        detailed_logging_active: true
      }
    };
    
    console.log(`✅ Exact postcode validation pipeline completed successfully`);
    console.log(`📈 Final success rate: ${summary.success_rate}`);
    console.log(`🎯 Exact matches found: ${exactMatches} (zero false positives)`);
    console.log(`📊 Extraction monitoring: Check logs for detailed performance data`);
    
    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
    
  } catch (err) {
    console.error('❌ Exact postcode validation pipeline error:', err);
    
    const errorResponse = {
      error: "Manus.ai Exact Postcode Validation failed",
      message: err.message || 'Unknown error occurred',
      api_status: "failed",
      validation_system: "exact_postcode_binary",
      timestamp: new Date().toISOString(),
      recommendations: [
        "🔑 Check ScrapingBee API key configuration in Supabase secrets",
        "🌐 Verify network connectivity and ScrapingBee service status",
        "📊 Review detailed extraction logs above for platform-specific issues",
        "🎯 Check if exact postcode extraction is working correctly",
        "💳 Ensure ScrapingBee account has sufficient credits for requests"
      ]
    };
    
    return new Response(
      JSON.stringify(errorResponse, null, 2),
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
