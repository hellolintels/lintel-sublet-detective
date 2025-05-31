import { EnhancedScrapingBeeResults } from './enhanced-types.ts';
import { PostcodeResult } from './types.ts';

export class ResponseFormatter {
  static formatComprehensiveResponse(
    testPostcodes: PostcodeResult[],
    coordsCount: number,
    enhancedResults: EnhancedScrapingBeeResults
  ) {
    const { results, accuracySummary } = enhancedResults;
    
    // Calculate enhanced metrics with accuracy focus
    const totalMatches = results.reduce((count: number, result: any) => {
      if (result.airbnb?.status === "investigate") count++;
      if (result.spareroom?.status === "investigate") count++;
      if (result.gumtree?.status === "investigate") count++;
      return count;
    }, 0);

    const highAccuracyResults = accuracySummary?.accuracyStats?.highAccuracy || 0;
    const totalAccuracyResults = (accuracySummary?.accuracyStats?.highAccuracy || 0) + 
                                (accuracySummary?.accuracyStats?.mediumAccuracy || 0) + 
                                (accuracySummary?.accuracyStats?.lowAccuracy || 0);
    
    const accuracyRate = totalAccuracyResults > 0 ? (highAccuracyResults / totalAccuracyResults) * 100 : 0;

    return {
      test_type: "Enhanced Accuracy Verification",
      total_postcodes: testPostcodes.length,
      test_completed: new Date().toISOString(),
      api_status: "success",
      boundary_service: "OS Places API + Enhanced Validation",
      search_precision: `${accuracyRate.toFixed(1)}% high-accuracy results`,
      
      // Enhanced accuracy metrics
      accuracy_metrics: {
        high_accuracy_count: highAccuracyResults,
        medium_accuracy_count: accuracySummary?.accuracyStats?.mediumAccuracy || 0,
        low_accuracy_count: accuracySummary?.accuracyStats?.lowAccuracy || 0,
        accuracy_rate: `${accuracyRate.toFixed(1)}%`,
        postcode_validation: {
          exact_matches: accuracySummary?.postcodeValidation?.exactMatches || 0,
          partial_matches: accuracySummary?.postcodeValidation?.partialMatches || 0,
          no_matches: accuracySummary?.postcodeValidation?.noMatches || 0
        }
      },

      // Platform performance with accuracy focus
      platform_accuracy: {
        airbnb: {
          investigated: accuracySummary?.platformStats?.airbnb?.investigated || 0,
          no_match: accuracySummary?.platformStats?.airbnb?.noMatch || 0,
          errors: accuracySummary?.platformStats?.airbnb?.errors || 0,
          accuracy_focus: "coordinate-based + location validation"
        },
        spareroom: {
          investigated: accuracySummary?.platformStats?.spareroom?.investigated || 0,
          no_match: accuracySummary?.platformStats?.spareroom?.noMatch || 0,
          errors: accuracySummary?.platformStats?.spareroom?.errors || 0
        },
        gumtree: {
          investigated: accuracySummary?.platformStats?.gumtree?.investigated || 0,
          no_match: accuracySummary?.platformStats?.gumtree?.noMatch || 0,
          errors: accuracySummary?.platformStats?.gumtree?.errors || 0
        }
      },

      performance: {
        total_matches_found: totalMatches,
        coordinate_precision: `${coordsCount}/${testPostcodes.length} postcodes with precise coordinates`,
        validation_method: "Enhanced location extraction + geographic validation"
      },

      recommendations: accuracySummary?.recommendations || [],
      overall_success: accuracyRate >= 70 && totalMatches > 0,
      results: results
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
