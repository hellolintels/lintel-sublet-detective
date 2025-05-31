
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { TestPostcodeProvider } from './test-postcode-provider.ts';
import { TestCoordinator } from './test-coordinator.ts';
import { ResponseFormatter } from './response-formatter.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    // Get test postcodes
    const testPostcodes = TestPostcodeProvider.getTestPostcodes();
    
    // Execute the test pipeline
    const { coordsCount, enhancedResults } = await TestCoordinator.executeTestPipeline(testPostcodes);
    
    // Format comprehensive results
    const summary = ResponseFormatter.formatComprehensiveResponse(testPostcodes, coordsCount, enhancedResults);
    
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
    console.error('❌ Enhanced ScrapingBee test pipeline error:', err);
    
    const errorResponse = ResponseFormatter.formatErrorResponse(err);
    
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
