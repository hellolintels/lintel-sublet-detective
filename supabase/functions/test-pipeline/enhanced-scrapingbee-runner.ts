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
import { BlockingDetector } from './blocking-detector.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

class EnhancedScrapingBeeRunner {
  private circuitBreaker: CircuitBreakerManager;
  private rateLimiter: RateLimiter;
  private platformConfig: PlatformConfigManager;
  private blockingDetector: BlockingDetector;
  private creditUsage = { premium: 0, standard: 0, total: 0 };
  private dailyBudget = 600; // Reduced budget for conservative approach
  private blockingAlerts: string[] = [];

  constructor() {
    this.circuitBreaker = new CircuitBreakerManager();
    this.rateLimiter = new RateLimiter();
    this.platformConfig = new PlatformConfigManager();
    this.blockingDetector = new BlockingDetector();
    
    // Enable conservative mode for anti-blocking
    this.rateLimiter.setConservativeMode(true);
  }

  async runEnhancedTests(postcodes: PostcodeResult[]): Promise<EnhancedScrapingBeeResults> {
    console.log(`🛡️ Starting Anti-Blocking Property Search Verification for ${postcodes.length} postcodes`);
    console.log(`🔒 Conservative mode enabled with premium proxies and enhanced delays`);
    
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
      console.log(`\n🎯 Processing ${group.area} area (${group.postcodes.length} postcodes) - Anti-blocking mode`);
      
      const groupResults = await this.processPostcodeGroup(group);
      testResults.push(...groupResults.results);
      
      responseTimes.push(...groupResults.responseTimes);
      successfulRequests += groupResults.successCount;
      totalRequests += groupResults.totalRequests;

      if (this.shouldPauseForCreditConservation()) {
        console.log(`⚠️ Pausing processing to conserve credits`);
        break;
      }

      // Check for blocking alerts
      if (this.blockingAlerts.length > 2) {
        console.log(`🚨 Multiple blocking alerts detected, pausing for safety`);
        break;
      }
    }

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const apiWorking = successRate >= 30; // More lenient due to anti-blocking measures
    const overallSuccess = apiWorking && successfulRequests > 0;

    const recommendations = this.generateVerificationRecommendations(successRate, testResults);
    const circuitBreakerStatus = this.circuitBreaker.getCircuitBreakerStatus();
    const creditUsage = this.getCreditUsageStats();

    console.log(`✅ Anti-blocking verification completed`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}% (${successfulRequests}/${totalRequests})`);
    console.log(`🛡️ Blocking alerts: ${this.blockingAlerts.length}`);

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
      console.log(`\n📍 Processing ${postcodeData.postcode} for verification (anti-blocking mode)`);
      
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
      
      // Extra delay between postcodes for anti-blocking
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
      
      console.log(`🔍 Testing ${platform} for ${postcodeData.postcode} (anti-blocking: ${config.description})`);
      
      // Anti-blocking delay before request
      await this.rateLimiter.waitBetweenRequests('platform');
      
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
      
      // Enhanced blocking detection
      const blockingAnalysis = this.blockingDetector.analyzeForBlocking(html, platform, url);
      this.blockingDetector.logBlockingAlert(platform, blockingAnalysis);
      
      if (blockingAnalysis.isBlocked) {
        this.blockingAlerts.push(`${platform}: ${blockingAnalysis.recommendation}`);
        this.circuitBreaker.recordFailure(platform);
        throw new Error(`${platform} blocking detected: ${blockingAnalysis.indicators.join(', ')}`);
      }
      
      const result = HTMLAnalyzer.analyzeForVerificationLinks(html, postcodeData, platform, url);
      
      this.circuitBreaker.resetFailures(platform);
      
      return {
        ...result,
        responseTime,
        url,
        creditCost: config.creditCost,
        blockingAnalysis: blockingAnalysis.isSuspicious ? blockingAnalysis.recommendation : undefined
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
    return usagePercent >= 85; // More conservative threshold
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
        spareroom: requestCounts.spareroom.daily * 10, // Updated to reflect premium usage
        gumtree: requestCounts.gumtree.daily * 10      // Updated to reflect premium usage
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
    
    if (this.blockingAlerts.length > 0) {
      recommendations.push(`🚨 Blocking detected: ${this.blockingAlerts.length} alerts - Anti-blocking measures active`);
    }
    
    if (totalMatches > 0) {
      recommendations.push(`✅ Found ${totalMatches} properties requiring verification - click "View Live Listing" links to verify`);
    }
    
    if (totalNoMatches > 0) {
      recommendations.push(`🔍 ${totalNoMatches} search areas showed no listings - click "Verify Search Area" to confirm`);
    }
    
    if (successRate < 20) {
      recommendations.push("⚠️ Low success rate - consider increasing delays or enabling stealth mode");
    } else if (successRate >= 50) {
      recommendations.push("📈 Good success rate with anti-blocking measures active");
    }

    recommendations.push("🛡️ Anti-blocking mode: Premium proxies enabled, conservative delays active");
    
    return recommendations;
  }
}

export async function runEnhancedScrapingBeeTests(postcodes: PostcodeResult[]): Promise<EnhancedScrapingBeeResults> {
  const runner = new EnhancedScrapingBeeRunner();
  return await runner.runEnhancedTests(postcodes);
}
