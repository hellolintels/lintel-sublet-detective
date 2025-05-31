
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
    
    console.log(`🎯 Enhanced Property Search Verification Pipeline Starting`);
    
    // Get test postcodes
    const testPostcodes = TestPostcodeProvider.getTestPostcodes();
    console.log(`📍 Testing ${testPostcodes.length} postcodes with enhanced accuracy validation`);
    
    // Add coordinates for precision
    const postcodesWithCoords = await addCoordinatesToPostcodes(testPostcodes);
    const coordsCount = postcodesWithCoords.filter(p => p.latitude && p.longitude).length;
    console.log(`📍 Coordinate enhancement: ${coordsCount}/${testPostcodes.length} postcodes now have precise coordinates`);
    
    // Run enhanced test pipeline
    const orchestrator = new EnhancedTestOrchestrator();
    const { results, summary } = await orchestrator.runEnhancedTestPipeline(postcodesWithCoords);
    
    // Format final response
    const response = {
      test_type: "Enhanced Property Search Verification",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      api_status: "success",
      boundary_service: "OS Places API + Enhanced Location Validation",
      search_precision: "Postcode/Coordinate Level with Hyperlinked Verification",
      
      coordinate_precision: `${coordsCount}/${testPostcodes.length} postcodes with precise coordinates`,
      
      summary,
      
      overall_success: summary.success_rate >= 70,
      results: results
    };
    
    console.log(`✅ Enhanced test pipeline completed successfully`);
    console.log(`📈 Final success rate: ${summary.success_rate}`);
    
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
    console.error('❌ Enhanced test pipeline error:', err);
    
    const errorResponse = {
      error: "Enhanced Property Search Verification failed",
      message: err.message || 'Unknown error occurred',
      api_status: "failed",
      version: "enhanced_accuracy",
      timestamp: new Date().toISOString(),
      recommendations: [
        "🔑 Check ScrapingBee API key configuration in Supabase secrets",
        "🌐 Verify network connectivity and premium proxy access",
        "📊 Review Enhanced Test Pipeline logs for detailed error information",
        "💳 Ensure ScrapingBee account has sufficient credits for premium proxies",
        "🛠️ Contact support if enhanced configuration appears correct"
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
