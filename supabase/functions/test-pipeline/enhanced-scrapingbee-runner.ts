
import { PostcodeResult, TestResult } from './types.ts';
import { 
  EnhancedScrapingBeeResults, 
  CreditUsageStats, 
  GroupResults
} from './enhanced-types.ts';
import { PostcodeGrouper } from './postcode-grouper.ts';
import { PlatformConfigManager } from './platform-config.ts';
import { URLGenerators } from './url-generators.ts';
import { HTMLAnalyzer } from './html-analyzer.ts';
import { CircuitBreakerManager } from './circuit-breaker.ts';
import { RateLimiter } from './rate-limiter.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

class EnhancedScrapingBeeRunner {
  private circuitBreaker: CircuitBreakerManager;
  private rateLimiter: RateLimiter;
  private platformConfig: PlatformConfigManager;
  private creditUsage = { premium: 0, standard: 0, total: 0 };
  private dailyBudget = 800;

  constructor() {
    this.circuitBreaker = new CircuitBreakerManager();
    this.rateLimiter = new RateLimiter();
    this.platformConfig = new PlatformConfigManager();
  }

  async runEnhancedTests(postcodes: PostcodeResult[]): Promise<EnhancedScrapingBeeResults> {
    console.log(`🔍 Starting Property Search Verification for ${postcodes.length} postcodes`);
    
    if (!SCRAPINGBEE_API_KEY) {
      throw new Error("ScrapingBee API key not configured");
    }

    const postcodeGroups = PostcodeGrouper.groupPostcodesByArea(postcodes);
    console.log(`📍 Grouped ${postcodes.length} postcodes into ${postcodeGroups.length} geographic areas`);

    const testResults: TestResult[] = [];
    const responseTimes: number[] = [];
    let successfulRequests = 0;
    let totalRequests = 0;

    for (const group of postcodeGroups) {
      console.log(`\n🎯 Processing ${group.area} area (${group.postcodes.length} postcodes)`);
      
      const groupResults = await this.processPostcodeGroup(group);
      testResults.push(...groupResults.results);
      
      responseTimes.push(...groupResults.responseTimes);
      successfulRequests += groupResults.successCount;
      totalRequests += groupResults.totalRequests;

      if (this.shouldPauseForCreditConservation()) {
        console.log(`⚠️ Pausing processing to conserve credits`);
        break;
      }
    }

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const apiWorking = successRate >= 40;
    const overallSuccess = apiWorking && successfulRequests > 0;

    const recommendations = this.generateVerificationRecommendations(successRate, testResults);
    const circuitBreakerStatus = this.circuitBreaker.getCircuitBreakerStatus();
    const creditUsage = this.getCreditUsageStats();

    console.log(`✅ Property Search Verification completed`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}% (${successfulRequests}/${totalRequests})`);

    return {
      testResults,
      apiWorking,
      avgResponseTime,
      successfulRequests,
      totalRequests,
      creditUsage,
      circuitBreakerStatus,
      recommendations,
      overallSuccess
    };
  }

  private async processPostcodeGroup(group: any): Promise<GroupResults> {
    const results: TestResult[] = [];
    const responseTimes: number[] = [];
    let successCount = 0;
    let totalRequests = 0;

    for (const postcodeData of group.postcodes) {
      console.log(`\n📍 Processing ${postcodeData.postcode} for verification`);
      
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        coordinates: postcodeData.latitude && postcodeData.longitude ? 
          { lat: postcodeData.latitude, lng: postcodeData.longitude } : undefined,
        airbnb: await this.testPlatformForVerification(postcodeData, 'airbnb'),
        spareroom: await this.testPlatformForVerification(postcodeData, 'spareroom'),
        gumtree: await this.testPlatformForVerification(postcodeData, 'gumtree')
      };

      [result.airbnb, result.spareroom, result.gumtree].forEach(platformResult => {
        if (platformResult.responseTime) responseTimes.push(platformResult.responseTime);
        totalRequests++;
        if (platformResult.status === "investigate" || platformResult.status === "no_match") {
          successCount++;
        }
      });

      results.push(result);
      await this.rateLimiter.waitBetweenRequests('batch');
    }

    return { results, responseTimes, successCount, totalRequests };
  }

  private async testPlatformForVerification(postcodeData: PostcodeResult, platform: string) {
    // Update platform config with current failure count
    this.platformConfig.updateFailureCount(platform, this.circuitBreaker.getFailureCount(platform));

    if (this.circuitBreaker.isCircuitBreakerOpen(platform)) {
      console.log(`🚫 Circuit breaker open for ${platform}, skipping request`);
      return {
        status: "error",
        count: 0,
        message: `Circuit breaker open for ${platform}`,
        responseTime: 0
      };
    }

    if (!this.rateLimiter.canMakeRequest(platform)) {
      console.log(`⏳ Rate limit reached for ${platform}, skipping request`);
      return {
        status: "error",
        count: 0,
        message: `Rate limit reached for ${platform}`,
        responseTime: 0
      };
    }

    const startTime = Date.now();
    
    try {
      const config = this.platformConfig.getPlatformConfig(platform, postcodeData);
      const searchQuery = URLGenerators.buildSearchQuery(postcodeData, platform);
      const url = URLGenerators.buildPlatformUrl(platform, searchQuery);
      
      console.log(`🔍 Testing ${platform} for ${postcodeData.postcode} (verification focus)`);
      
      const scrapingBeeUrl = URLGenerators.buildScrapingBeeUrl(url, config.params, SCRAPINGBEE_API_KEY!);
      const response = await fetch(scrapingBeeUrl);
      const responseTime = Date.now() - startTime;
      
      this.updateCreditUsage(platform, config.params.premium_proxy === 'true');
      this.rateLimiter.updateRequestCounts(platform);

      console.log(`📊 ${platform} response: ${response.status} (${responseTime}ms)`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.circuitBreaker.recordFailure(platform);
        throw new Error(`ScrapingBee API error: ${response.status} - ${errorText}`);
      }
      
      const html = await response.text();
      const result = HTMLAnalyzer.analyzeForVerificationLinks(html, postcodeData, platform, url);
      
      this.circuitBreaker.resetFailures(platform);
      
      return {
        ...result,
        responseTime,
        url,
        creditCost: config.creditCost
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.circuitBreaker.recordFailure(platform);
      
      console.error(`❌ ${platform} error for ${postcodeData.postcode}:`, error);
      
      return {
        status: "error",
        count: 0,
        message: error.message,
        responseTime
      };
    }
  }

  private updateCreditUsage(platform: string, isPremium: boolean): void {
    const cost = isPremium ? (platform === 'airbnb' ? 25 : 10) : 5;
    this.creditUsage.total += cost;
    
    if (isPremium) {
      this.creditUsage.premium += cost;
    } else {
      this.creditUsage.standard += cost;
    }
  }

  private shouldPauseForCreditConservation(): boolean {
    const usagePercent = (this.creditUsage.total / this.dailyBudget) * 100;
    return usagePercent >= 90;
  }

  private getCreditUsageStats(): CreditUsageStats {
    const requestCounts = this.rateLimiter.getRequestCounts();
    return {
      totalCreditsUsed: this.creditUsage.total,
      premiumRequestsUsed: Math.floor(this.creditUsage.premium / 10),
      standardRequestsUsed: Math.floor(this.creditUsage.standard / 5),
      dailyBudgetRemaining: this.dailyBudget - this.creditUsage.total,
      costBreakdown: {
        airbnb: requestCounts.airbnb.daily * 25,
        spareroom: requestCounts.spareroom.daily * 8,
        gumtree: requestCounts.gumtree.daily * 6
      }
    };
  }

  private generateVerificationRecommendations(successRate: number, testResults: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    const totalMatches = testResults.reduce((sum, result) => {
      return sum + 
        (result.airbnb.status === "investigate" ? 1 : 0) +
        (result.spareroom.status === "investigate" ? 1 : 0) +
        (result.gumtree.status === "investigate" ? 1 : 0);
    }, 0);

    const totalNoMatches = testResults.reduce((sum, result) => {
      return sum + 
        (result.airbnb.status === "no_match" ? 1 : 0) +
        (result.spareroom.status === "no_match" ? 1 : 0) +
        (result.gumtree.status === "no_match" ? 1 : 0);
    }, 0);
    
    if (totalMatches > 0) {
      recommendations.push(`✅ Found ${totalMatches} properties requiring verification - click "View Live Listing" links to verify`);
    }
    
    if (totalNoMatches > 0) {
      recommendations.push(`🔍 ${totalNoMatches} search areas showed no listings - click "Verify Search Area" to confirm`);
    }
    
    if (successRate < 30) {
      recommendations.push("⚠️ Low verification success rate - check individual platform results for errors");
    } else if (successRate >= 70) {
      recommendations.push("📈 High verification success rate - property search working well");
    }

    if (recommendations.length === 0) {
      recommendations.push("🔧 Property search verification completed - review individual results");
    }
    
    return recommendations;
  }
}

export async function runEnhancedScrapingBeeTests(postcodes: PostcodeResult[]): Promise<EnhancedScrapingBeeResults> {
  const runner = new EnhancedScrapingBeeRunner();
  return await runner.runEnhancedTests(postcodes);
}
