
import { PostcodeResult, TestResult } from './types.ts';
import { EnhancedScrapingBeeClient } from './enhanced-scraping-bee-client.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

export class EnhancedTestOrchestrator {
  private scrapingBeeClient = new EnhancedScrapingBeeClient();
  
  async runEnhancedTestPipeline(postcodes: PostcodeResult[]): Promise<{
    results: TestResult[];
    summary: any;
  }> {
    console.log(`🎯 Enhanced test pipeline starting for ${postcodes.length} postcodes`);
    console.log(`📍 Test postcodes: ${postcodes.map(p => p.postcode).join(', ')}`);
    
    const results: TestResult[] = [];
    let totalMatches = 0;
    let totalNoMatches = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < postcodes.length; i++) {
      const postcodeData = postcodes[i];
      const coordinateInfo = postcodeData.latitude && postcodeData.longitude 
        ? `(${postcodeData.latitude.toFixed(6)}, ${postcodeData.longitude.toFixed(6)})`
        : '(no coordinates)';
      
      console.log(`\n🎯 [${i + 1}/${postcodes.length}] Enhanced testing: ${postcodeData.postcode} ${coordinateInfo}`);
      console.log(`📍 Address: ${postcodeData.address}`);
      console.log(`🛣️ Street: ${postcodeData.streetName || 'Unknown'}`);
      
      try {
        const result: TestResult = {
          postcode: postcodeData.postcode,
          address: postcodeData.address,
          streetName: postcodeData.streetName || "",
          latitude: postcodeData.latitude,
          longitude: postcodeData.longitude,
          boundary: postcodeData.boundary,
          coordinates: postcodeData.latitude && postcodeData.longitude ? {
            lat: postcodeData.latitude,
            lng: postcodeData.longitude
          } : undefined,
          airbnb: await this.testPlatform(postcodeData, 'airbnb'),
          spareroom: await this.testPlatform(postcodeData, 'spareroom'),
          gumtree: await this.testPlatform(postcodeData, 'gumtree')
        };
        
        // Count results for summary
        [result.airbnb, result.spareroom, result.gumtree].forEach(platformResult => {
          if (platformResult.status === 'investigate') totalMatches++;
          else if (platformResult.status === 'no_match') totalNoMatches++;
          else if (platformResult.status === 'error') totalErrors++;
        });
        
        // Enhanced logging
        console.log(`📊 ${postcodeData.postcode} enhanced results:`);
        console.log(`  Airbnb: ${result.airbnb.status} (${result.airbnb.count} listings, ${result.airbnb.confidence || 'N/A'} confidence)`);
        console.log(`  SpareRoom: ${result.spareroom.status} (${result.spareroom.count} listings, ${result.spareroom.confidence || 'N/A'} confidence)`);
        console.log(`  Gumtree: ${result.gumtree.status} (${result.gumtree.count} listings, ${result.gumtree.confidence || 'N/A'} confidence)`);
        
        results.push(result);
        
        // Rate limiting between postcodes
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error testing postcode ${postcodeData.postcode}:`, error);
        
        const errorResult: TestResult = {
          postcode: postcodeData.postcode,
          address: postcodeData.address,
          streetName: postcodeData.streetName || "",
          latitude: postcodeData.latitude,
          longitude: postcodeData.longitude,
          boundary: postcodeData.boundary,
          airbnb: { 
            status: "error", 
            count: 0, 
            message: error.message,
            search_method: "error",
            precision: "failed"
          },
          spareroom: { 
            status: "error", 
            count: 0, 
            message: error.message,
            search_method: "error",
            precision: "failed"
          },
          gumtree: { 
            status: "error", 
            count: 0, 
            message: error.message,
            search_method: "error",
            precision: "failed"
          }
        };
        
        totalErrors += 3;
        results.push(errorResult);
      }
    }
    
    const summary = this.generateEnhancedSummary(results, totalMatches, totalNoMatches, totalErrors);
    
    console.log(`\n✅ Enhanced test pipeline completed for all ${postcodes.length} postcodes`);
    console.log(`📈 Summary: ${totalMatches} investigate, ${totalNoMatches} no_match, ${totalErrors} errors`);
    
    return { results, summary };
  }
  
  private async testPlatform(postcodeData: PostcodeResult, platform: string) {
    const url = this.buildPlatformUrl(platform, postcodeData);
    console.log(`🔍 Testing ${platform} with enhanced validation`);
    
    try {
      const result = await this.scrapingBeeClient.scrapeWithAccuracy(url, postcodeData, platform);
      
      console.log(`📊 ${platform} result: ${result.status} (${result.count} listings, ${result.confidence || 'N/A'} confidence)`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ ${platform} test failed:`, error);
      return {
        status: "error",
        count: 0,
        message: error.message,
        url,
        search_method: "error",
        precision: "failed"
      };
    }
  }
  
  private buildPlatformUrl(platform: string, postcodeData: PostcodeResult): string {
    const { postcode, streetName, address, latitude, longitude } = postcodeData;
    
    // Prioritize coordinate-based search for accuracy
    if (latitude && longitude && platform === 'airbnb') {
      return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&lat=${latitude}&lng=${longitude}&zoom=15`;
    }
    
    // Use full address if available
    const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
    
    switch (platform) {
      case 'airbnb':
        return `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(searchQuery)}`;
      case 'gumtree':
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(searchQuery)}&search_category=property-to-rent`;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }
  
  private generateEnhancedSummary(results: TestResult[], totalMatches: number, totalNoMatches: number, totalErrors: number) {
    const totalTests = results.length * 3; // 3 platforms per postcode
    const successRate = totalTests > 0 ? ((totalMatches + totalNoMatches) / totalTests) * 100 : 0;
    const usageStats = this.scrapingBeeClient.getUsageStats();
    
    return {
      test_type: "Enhanced Property Search Verification",
      total_postcodes: results.length,
      total_platform_tests: totalTests,
      success_rate: `${successRate.toFixed(1)}%`,
      
      result_breakdown: {
        properties_found: totalMatches,
        no_properties: totalNoMatches,
        errors: totalErrors
      },
      
      accuracy_metrics: {
        coordinate_based_searches: results.filter(r => r.coordinates).length,
        address_based_searches: results.filter(r => r.address && !r.coordinates).length,
        postcode_only_searches: results.filter(r => !r.address && !r.coordinates).length
      },
      
      platform_performance: {
        airbnb: this.getPlatformStats(results, 'airbnb'),
        spareroom: this.getPlatformStats(results, 'spareroom'),
        gumtree: this.getPlatformStats(results, 'gumtree')
      },
      
      scraping_bee_usage: usageStats,
      
      recommendations: this.generateRecommendations(successRate, totalMatches, totalErrors, usageStats)
    };
  }
  
  private getPlatformStats(results: TestResult[], platform: 'airbnb' | 'spareroom' | 'gumtree') {
    const platformResults = results.map(r => r[platform]);
    return {
      investigated: platformResults.filter(r => r.status === 'investigate').length,
      no_match: platformResults.filter(r => r.status === 'no_match').length,
      errors: platformResults.filter(r => r.status === 'error').length,
      avg_confidence: this.calculateAverageConfidence(platformResults)
    };
  }
  
  private calculateAverageConfidence(platformResults: any[]): string {
    const confidenceScores = platformResults
      .filter(r => r.validation_score)
      .map(r => r.validation_score);
    
    if (confidenceScores.length === 0) return 'N/A';
    
    const avg = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    return `${avg.toFixed(1)}%`;
  }
  
  private generateRecommendations(successRate: number, totalMatches: number, totalErrors: number, usageStats: any): string[] {
    const recommendations: string[] = [];
    
    if (successRate >= 80) {
      recommendations.push(`✅ Excellent performance: ${successRate.toFixed(1)}% success rate with enhanced accuracy validation`);
    } else if (successRate >= 60) {
      recommendations.push(`⚠️ Good performance: ${successRate.toFixed(1)}% success rate - monitor for improvements`);
    } else {
      recommendations.push(`🔧 Performance needs attention: ${successRate.toFixed(1)}% success rate`);
    }
    
    if (totalMatches > 0) {
      recommendations.push(`🏠 Found ${totalMatches} properties requiring verification - click "View Live Listing" links to verify`);
    }
    
    if (totalErrors > 5) {
      recommendations.push(`⚠️ High error rate detected - consider adjusting rate limiting or proxy settings`);
    }
    
    recommendations.push(`💳 ScrapingBee usage: ${usageStats.requestsUsed}/${usageStats.dailyLimit} requests used`);
    
    if (usageStats.requestsRemaining < 20) {
      recommendations.push(`🚨 Low requests remaining: ${usageStats.requestsRemaining} - monitor usage carefully`);
    }
    
    return recommendations;
  }
}
