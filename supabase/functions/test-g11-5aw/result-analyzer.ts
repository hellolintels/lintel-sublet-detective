
import { ScrapingResult } from './scraping-client.ts';

export function analyzeResults(results: ScrapingResult[], testPostcode: string) {
  const successfulResults = results.filter(r => r.success);
  const postcodeMatches = results.filter(r => r.success && r.postcodeDetection?.found);
  const totalCreditsUsed = results.length; // Each request uses 1 credit
  
  return {
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
      `✅ SUCCESS: Found ${testPostcode} using ${postcodeMatches.length} of ${results.length} strategies` : 
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
}
