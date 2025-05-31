
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { PostcodeResult } from './types.ts';
import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { runEnhancedScrapingBeeTests } from './enhanced-scrapingbee-runner.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🚀 Enhanced ScrapingBee API Test Pipeline - Production Ready");
    
    // Test postcodes for comprehensive testing
    const testPostcodes: PostcodeResult[] = [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
    
    console.log(`🎯 Running Enhanced ScrapingBee tests for ${testPostcodes.length} postcodes`);
    console.log(`🔧 Features: Smart proxy strategy, circuit breakers, geographic batching, credit optimization`);
    
    // Add coordinates to postcodes for precise search strategies
    console.log(`\n📍 Phase 1: Coordinate Lookup & Postcode Grouping`);
    const postcodesWithCoordinates = await addCoordinatesToPostcodes(testPostcodes);
    
    const coordsCount = postcodesWithCoordinates.filter(p => p.latitude && p.longitude).length;
    console.log(`✅ Coordinate lookup completed: ${coordsCount}/${testPostcodes.length} postcodes have precise coordinates`);
    
    // Run Enhanced ScrapingBee testing pipeline
    console.log(`\n🧪 Phase 2: Enhanced ScrapingBee API Testing`);
    const enhancedResults = await runEnhancedScrapingBeeTests(postcodesWithCoordinates);
    
    console.log("\n🎉 Enhanced ScrapingBee test pipeline completed");
    
    // Format comprehensive results with enhanced metrics
    const summary = {
      test_type: "enhanced_scrapingbee_api_test",
      version: "2.0_production_ready",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      api_status: enhancedResults.apiWorking ? "success" : "failed",
      api_service: "ScrapingBee REST API (Enhanced)",
      coordinate_service: coordsCount > 0 
        ? `OS Places API (${coordsCount}/${testPostcodes.length} building-level coordinates) with postcodes.io fallback`
        : "postcodes.io fallback only",
      
      // Enhanced API diagnostics
      api_diagnostics: {
        response_time_avg: enhancedResults.avgResponseTime,
        success_rate: `${enhancedResults.successfulRequests}/${enhancedResults.totalRequests}`,
        success_percentage: enhancedResults.totalRequests > 0 ? 
          ((enhancedResults.successfulRequests / enhancedResults.totalRequests) * 100).toFixed(1) + '%' : '0%',
        circuit_breaker_status: enhancedResults.circuitBreakerStatus
      },
      
      // Credit usage and efficiency metrics
      credit_analytics: {
        total_credits_used: enhancedResults.creditUsage.totalCreditsUsed,
        premium_requests: enhancedResults.creditUsage.premiumRequestsUsed,
        standard_requests: enhancedResults.creditUsage.standardRequestsUsed,
        daily_budget_remaining: enhancedResults.creditUsage.dailyBudgetRemaining,
        cost_per_platform: enhancedResults.creditUsage.costBreakdown,
        credit_efficiency: enhancedResults.creditUsage.totalCreditsUsed > 0 ? 
          ((enhancedResults.successfulRequests / enhancedResults.creditUsage.totalCreditsUsed) * 100).toFixed(2) + ' successes per credit' : 'N/A'
      },
      
      // Enhanced performance metrics
      performance: {
        airbnb_success_rate: `${enhancedResults.testResults.filter(r => r.airbnb.status === 'investigate' || r.airbnb.count > 0).length}/${testPostcodes.length}`,
        spareroom_success_rate: `${enhancedResults.testResults.filter(r => r.spareroom.status === 'investigate' || r.spareroom.count > 0).length}/${testPostcodes.length}`,
        gumtree_success_rate: `${enhancedResults.testResults.filter(r => r.gumtree.status === 'investigate' || r.gumtree.count > 0).length}/${testPostcodes.length}`,
        total_matches_found: enhancedResults.testResults.reduce((sum, r) => 
          sum + (r.airbnb.count || 0) + (r.spareroom.count || 0) + (r.gumtree.count || 0), 0
        ),
        average_response_time: enhancedResults.avgResponseTime,
        geographic_batching: "Enabled - postcodes grouped by area for cache optimization",
        smart_proxy_strategy: "Active - premium proxies for Airbnb, conditional for others"
      },
      
      // System health and recommendations
      system_health: {
        circuit_breakers: enhancedResults.circuitBreakerStatus,
        credit_conservation: enhancedResults.creditUsage.dailyBudgetRemaining > 100 ? "Healthy" : "Conservative mode active",
        rate_limiting: "Active - platform-specific limits enforced"
      },
      
      recommendations: enhancedResults.recommendations,
      overall_success: enhancedResults.overallSuccess,
      
      // Detailed results with enhanced metadata
      results: enhancedResults.testResults.map(result => ({
        postcode: result.postcode,
        address: result.address,
        coordinates: result.latitude && result.longitude ? 
          { lat: result.latitude, lng: result.longitude } : null,
        
        airbnb: {
          status: result.airbnb.status,
          count: result.airbnb.count,
          confidence: result.airbnb.confidence,
          url: result.airbnb.url,
          response_time: result.airbnb.responseTime,
          credit_cost: result.airbnb.creditCost || 25,
          proxy_type: "premium+stealth"
        },
        spareroom: {
          status: result.spareroom.status,
          count: result.spareroom.count,
          confidence: result.spareroom.confidence,
          url: result.spareroom.url,
          response_time: result.spareroom.responseTime,
          credit_cost: result.spareroom.creditCost || 8,
          proxy_type: result.spareroom.creditCost > 5 ? "premium" : "standard"
        },
        gumtree: {
          status: result.gumtree.status,
          count: result.gumtree.count,
          confidence: result.gumtree.confidence,
          url: result.gumtree.url,
          response_time: result.gumtree.responseTime,
          credit_cost: result.gumtree.creditCost || 5,
          proxy_type: result.gumtree.creditCost > 5 ? "premium" : "standard"
        }
      })),
      
      // Enhanced next steps based on results
      next_steps: enhancedResults.overallSuccess 
        ? [
            "🚀 Enhanced ScrapingBee system performing excellently",
            "💰 Credit efficiency optimized with smart proxy strategy",
            "🔄 Circuit breakers and rate limiting protecting against blocks",
            "📈 Ready for production deployment with current configuration",
            "🎯 Consider expanding postcode coverage or adding new platforms"
          ]
        : [
            "🔧 Review circuit breaker thresholds and proxy configurations",
            "💡 Increase premium proxy usage for problematic areas",
            "⏱️ Adjust timing intervals between requests",
            "📊 Analyze credit usage patterns for optimization opportunities",
            "🛠️ Contact ScrapingBee support for account-specific recommendations"
          ],

      // Production readiness assessment
      production_readiness: {
        api_reliability: enhancedResults.overallSuccess ? "✅ Ready" : "⚠️ Needs optimization",
        credit_efficiency: enhancedResults.creditUsage.totalCreditsUsed < 200 ? "✅ Efficient" : "⚠️ Review needed",
        error_handling: "✅ Circuit breakers active",
        rate_limiting: "✅ Platform-specific limits enforced",
        geographic_optimization: "✅ Area-based batching implemented",
        recommendation: enhancedResults.overallSuccess ? 
          "System ready for production deployment" : 
          "Address blocking issues before production use"
      }
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
    console.error('❌ Enhanced ScrapingBee test pipeline error:', err);
    
    return new Response(
      JSON.stringify({
        error: "Enhanced ScrapingBee test pipeline failed",
        message: err.message || 'Unknown error occurred',
        api_status: "failed",
        version: "2.0_enhanced",
        timestamp: new Date().toISOString(),
        recommendations: [
          "🔑 Check ScrapingBee API key configuration in Supabase secrets",
          "🌐 Verify network connectivity and firewall settings",
          "📊 Review Supabase Edge Function logs for detailed error information",
          "💳 Ensure ScrapingBee Freelance account has sufficient credits",
          "🛠️ Contact support if configuration appears correct"
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
