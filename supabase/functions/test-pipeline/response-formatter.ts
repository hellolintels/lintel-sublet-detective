
import { EnhancedScrapingBeeResults } from './enhanced-types.ts';
import { PostcodeResult } from './types.ts';

export class ResponseFormatter {
  static formatComprehensiveResponse(
    testPostcodes: PostcodeResult[],
    coordsCount: number,
    enhancedResults: EnhancedScrapingBeeResults
  ) {
    return {
      test_type: "enhanced_scrapingbee_api_test",
      version: "2.0_production_ready",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      api_status: enhancedResults.apiWorking ? "success" : "failed",
      api_service: "ScrapingBee REST API (Enhanced)",
      coordinate_service: coordsCount > 0 
        ? `OS Places API (${coordsCount}/${testPostcodes.length} building-level coordinates) with postcodes.io fallback`
        : "postcodes.io fallback only",
      
      api_diagnostics: {
        response_time_avg: enhancedResults.avgResponseTime,
        success_rate: `${enhancedResults.successfulRequests}/${enhancedResults.totalRequests}`,
        success_percentage: enhancedResults.totalRequests > 0 ? 
          ((enhancedResults.successfulRequests / enhancedResults.totalRequests) * 100).toFixed(1) + '%' : '0%',
        circuit_breaker_status: enhancedResults.circuitBreakerStatus
      },
      
      credit_analytics: {
        total_credits_used: enhancedResults.creditUsage.totalCreditsUsed,
        premium_requests: enhancedResults.creditUsage.premiumRequestsUsed,
        standard_requests: enhancedResults.creditUsage.standardRequestsUsed,
        daily_budget_remaining: enhancedResults.creditUsage.dailyBudgetRemaining,
        cost_per_platform: enhancedResults.creditUsage.costBreakdown,
        credit_efficiency: enhancedResults.creditUsage.totalCreditsUsed > 0 ? 
          ((enhancedResults.successfulRequests / enhancedResults.creditUsage.totalCreditsUsed) * 100).toFixed(2) + ' successes per credit' : 'N/A'
      },
      
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
      
      system_health: {
        circuit_breakers: enhancedResults.circuitBreakerStatus,
        credit_conservation: enhancedResults.creditUsage.dailyBudgetRemaining > 100 ? "Healthy" : "Conservative mode active",
        rate_limiting: "Active - platform-specific limits enforced"
      },
      
      recommendations: enhancedResults.recommendations,
      overall_success: enhancedResults.overallSuccess,
      
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
          proxy_type: "premium+stealth",
          listing_url: result.airbnb.listing_url,
          map_view_url: result.airbnb.map_view_url
        },
        spareroom: {
          status: result.spareroom.status,
          count: result.spareroom.count,
          confidence: result.spareroom.confidence,
          url: result.spareroom.url,
          response_time: result.spareroom.responseTime,
          credit_cost: result.spareroom.creditCost || 8,
          proxy_type: result.spareroom.creditCost > 5 ? "premium" : "standard",
          listing_url: result.spareroom.listing_url,
          map_view_url: result.spareroom.map_view_url
        },
        gumtree: {
          status: result.gumtree.status,
          count: result.gumtree.count,
          confidence: result.gumtree.confidence,
          url: result.gumtree.url,
          response_time: result.gumtree.responseTime,
          credit_cost: result.gumtree.creditCost || 5,
          proxy_type: result.gumtree.creditCost > 5 ? "premium" : "standard",
          listing_url: result.gumtree.listing_url,
          map_view_url: result.gumtree.map_view_url
        }
      })),
      
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
  }

  static formatErrorResponse(error: any) {
    return {
      error: "Enhanced ScrapingBee test pipeline failed",
      message: error.message || 'Unknown error occurred',
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
    };
  }
}
