import { PostcodeResult, TestResult } from './types.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

export interface EnhancedScrapingBeeResults {
  testResults: TestResult[];
  apiWorking: boolean;
  avgResponseTime: number;
  successfulRequests: number;
  totalRequests: number;
  creditUsage: CreditUsageStats;
  circuitBreakerStatus: CircuitBreakerStatus;
  recommendations: string[];
  overallSuccess: boolean;
}

interface CreditUsageStats {
  totalCreditsUsed: number;
  premiumRequestsUsed: number;
  standardRequestsUsed: number;
  dailyBudgetRemaining: number;
  costBreakdown: {
    airbnb: number;
    spareroom: number;
    gumtree: number;
  };
}

interface CircuitBreakerStatus {
  airbnb: { isOpen: boolean; failures: number; nextRetryTime?: number };
  spareroom: { isOpen: boolean; failures: number; nextRetryTime?: number };
  gumtree: { isOpen: boolean; failures: number; nextRetryTime?: number };
}

interface PostcodeGroup {
  area: string;
  postcodes: PostcodeResult[];
  priority: 'high' | 'medium' | 'low';
}

class EnhancedScrapingBeeRunner {
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();
  private creditUsage = { premium: 0, standard: 0, total: 0 };
  private dailyBudget = 800; // Conservative daily request limit
  private platformLimits = {
    airbnb: { daily: 300, hourly: 15 },
    spareroom: { daily: 250, hourly: 20 },
    gumtree: { daily: 250, hourly: 25 }
  };
  private requestCounts = {
    airbnb: { daily: 0, hourly: 0, lastHourReset: Date.now() },
    spareroom: { daily: 0, hourly: 0, lastHourReset: Date.now() },
    gumtree: { daily: 0, hourly: 0, lastHourReset: Date.now() }
  };

  async runEnhancedTests(postcodes: PostcodeResult[]): Promise<EnhancedScrapingBeeResults> {
    console.log(`🚀 Starting Enhanced ScrapingBee tests for ${postcodes.length} postcodes`);
    
    if (!SCRAPINGBEE_API_KEY) {
      throw new Error("ScrapingBee API key not configured");
    }

    // Group and prioritize postcodes by geographic area
    const postcodeGroups = this.groupPostcodesByArea(postcodes);
    console.log(`📍 Grouped ${postcodes.length} postcodes into ${postcodeGroups.length} geographic areas`);

    const testResults: TestResult[] = [];
    const responseTimes: number[] = [];
    let successfulRequests = 0;
    let totalRequests = 0;

    // Process postcodes in optimized order with platform rotation
    for (const group of postcodeGroups) {
      console.log(`\n🎯 Processing ${group.area} area (${group.postcodes.length} postcodes, priority: ${group.priority})`);
      
      const groupResults = await this.processPostcodeGroup(group);
      testResults.push(...groupResults.results);
      
      // Update metrics
      responseTimes.push(...groupResults.responseTimes);
      successfulRequests += groupResults.successCount;
      totalRequests += groupResults.totalRequests;

      // Check if we should continue based on credit usage
      if (this.shouldPauseForCreditConservation()) {
        console.log(`⚠️ Pausing processing to conserve credits (${this.creditUsage.total}/${this.dailyBudget} used)`);
        break;
      }
    }

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const apiWorking = successRate >= 40; // Adjusted threshold for enhanced system
    const overallSuccess = apiWorking && successfulRequests > 0;

    const recommendations = this.generateEnhancedRecommendations(successRate, testResults);
    const circuitBreakerStatus = this.getCircuitBreakerStatus();
    const creditUsage = this.getCreditUsageStats();

    console.log(`✅ Enhanced ScrapingBee tests completed`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}% (${successfulRequests}/${totalRequests})`);
    console.log(`💰 Credits Used: ${creditUsage.totalCreditsUsed} (${creditUsage.premiumRequestsUsed} premium, ${creditUsage.standardRequestsUsed} standard)`);

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

  private groupPostcodesByArea(postcodes: PostcodeResult[]): PostcodeGroup[] {
    const groups = new Map<string, PostcodeResult[]>();
    
    postcodes.forEach(postcode => {
      // Extract area from postcode (e.g., "EH12 8UU" -> "EH12", "G11 5AW" -> "G11")
      const area = postcode.postcode.split(' ')[0];
      if (!groups.has(area)) {
        groups.set(area, []);
      }
      groups.get(area)!.push(postcode);
    });

    return Array.from(groups.entries()).map(([area, postcodes]) => ({
      area,
      postcodes,
      priority: this.assessAreaPriority(area, postcodes)
    })).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private assessAreaPriority(area: string, postcodes: PostcodeResult[]): 'high' | 'medium' | 'low' {
    // Edinburgh and Glasgow high priority (major cities)
    if (area.startsWith('EH') || area.startsWith('G')) return 'high';
    // London postcodes would be high priority
    if (area.match(/^[ENSW][0-9]/)) return 'high';
    // Other major cities medium priority
    if (area.match(/^(M|B|L|S|CF|LS|NE)[0-9]/)) return 'medium';
    return 'low';
  }

  private async processPostcodeGroup(group: PostcodeGroup): Promise<{
    results: TestResult[];
    responseTimes: number[];
    successCount: number;
    totalRequests: number;
  }> {
    const results: TestResult[] = [];
    const responseTimes: number[] = [];
    let successCount = 0;
    let totalRequests = 0;

    // Process with platform rotation for better cache utilization
    for (const postcodeData of group.postcodes) {
      console.log(`\n📍 Processing ${postcodeData.postcode} (${group.area} area)`);
      
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: await this.testPlatformWithEnhancements(postcodeData, 'airbnb'),
        spareroom: await this.testPlatformWithEnhancements(postcodeData, 'spareroom'),
        gumtree: await this.testPlatformWithEnhancements(postcodeData, 'gumtree')
      };

      // Collect metrics
      [result.airbnb, result.spareroom, result.gumtree].forEach(platformResult => {
        if (platformResult.responseTime) responseTimes.push(platformResult.responseTime);
        totalRequests++;
        if (platformResult.status === "investigate" || platformResult.count > 0) {
          successCount++;
        }
      });

      results.push(result);

      // Intelligent spacing between requests
      await this.waitBetweenRequests('batch');
    }

    return { results, responseTimes, successCount, totalRequests };
  }

  private async testPlatformWithEnhancements(postcodeData: PostcodeResult, platform: string) {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(platform)) {
      console.log(`🚫 Circuit breaker open for ${platform}, skipping request`);
      return {
        status: "error",
        count: 0,
        message: `Circuit breaker open for ${platform}`,
        responseTime: 0
      };
    }

    // Check rate limits
    if (!this.canMakeRequest(platform)) {
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
      const config = this.getPlatformConfig(platform, postcodeData);
      const searchQuery = this.buildSearchQuery(postcodeData, platform);
      const url = this.buildPlatformUrl(platform, searchQuery);
      
      console.log(`🔍 Testing ${platform} for ${postcodeData.postcode} (config: ${config.description})`);
      
      const scrapingBeeUrl = this.buildScrapingBeeUrl(url, config.params);
      const response = await fetch(scrapingBeeUrl);
      const responseTime = Date.now() - startTime;
      
      // Update credit usage
      this.updateCreditUsage(platform, config.params.premium_proxy === 'true');
      this.updateRequestCounts(platform);

      console.log(`📊 ${platform} response: ${response.status} (${responseTime}ms, credits: +${config.creditCost})`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.recordFailure(platform);
        throw new Error(`ScrapingBee API error: ${response.status} - ${errorText}`);
      }
      
      const html = await response.text();
      const result = this.analyzeEnhancedResponse(html, postcodeData, platform, url, config);
      
      // Reset failure count on success
      this.resetFailures(platform);
      
      return {
        ...result,
        responseTime,
        url,
        creditCost: config.creditCost
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(platform);
      
      console.error(`❌ ${platform} error for ${postcodeData.postcode}:`, error);
      
      return {
        status: "error",
        count: 0,
        message: error.message,
        responseTime
      };
    }
  }

  private getPlatformConfig(platform: string, postcodeData: PostcodeResult) {
    const isProblematicArea = this.isProblematicPostcode(postcodeData.postcode);
    
    switch (platform) {
      case 'airbnb':
        return {
          params: {
            premium_proxy: 'true',
            stealth_proxy: 'true',
            block_ads: 'true',
            wait: '7000',
            wait_browser: 'load',
            country_code: 'gb',
            render_js: 'true'
          },
          creditCost: 25, // Premium + stealth
          description: 'Premium+Stealth (Max Protection)'
        };
      
      case 'spareroom':
        const usesPremium = isProblematicArea || this.getFailureCount('spareroom') > 2;
        return {
          params: {
            premium_proxy: usesPremium ? 'true' : 'false',
            wait: '3000',
            country_code: 'gb',
            render_js: 'true',
            block_ads: 'true'
          },
          creditCost: usesPremium ? 10 : 5,
          description: usesPremium ? 'Premium (Enhanced)' : 'Standard'
        };
      
      case 'gumtree':
        const needsPremium = isProblematicArea || this.getFailureCount('gumtree') > 5;
        return {
          params: {
            premium_proxy: needsPremium ? 'true' : 'false',
            wait: '2000',
            country_code: 'gb',
            render_js: 'true',
            cookies: 'true'
          },
          creditCost: needsPremium ? 10 : 5,
          description: needsPremium ? 'Premium (Escalated)' : 'Standard'
        };
      
      default:
        return {
          params: { render_js: 'true', wait: '2000' },
          creditCost: 5,
          description: 'Basic'
        };
    }
  }

  private buildSearchQuery(postcodeData: PostcodeResult, platform: string): string {
    const { postcode, streetName, address } = postcodeData;
    
    // Use full address for better precision when available
    if (address && address.length > postcode.length + 10) {
      return address;
    }
    
    // Use street + postcode combination
    if (streetName) {
      return `${streetName}, ${postcode}`;
    }
    
    return postcode;
  }

  private buildPlatformUrl(platform: string, searchQuery: string): string {
    const encodedQuery = encodeURIComponent(searchQuery);
    
    switch (platform) {
      case 'airbnb':
        return `https://www.airbnb.com/s/${encodedQuery}/homes?refinement_paths%5B%5D=%2Fhomes`;
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?search=${encodedQuery}&mode=list`;
      case 'gumtree':
        return `https://www.gumtree.com/search?search_location=${encodedQuery}&search_category=property-to-rent`;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  private buildScrapingBeeUrl(targetUrl: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams({
      api_key: SCRAPINGBEE_API_KEY!,
      url: targetUrl,
      ...params
    });
    
    return `https://app.scrapingbee.com/api/v1/?${searchParams.toString()}`;
  }

  private analyzeEnhancedResponse(html: string, postcodeData: PostcodeResult, platform: string, url: string, config: any) {
    const { postcode, streetName } = postcodeData;
    
    // Enhanced blocking detection
    if (this.detectBlocking(html, platform)) {
      return {
        status: "error",
        count: 0,
        message: `${platform} blocking detected - consider increasing wait time or using different proxy tier`
      };
    }

    // Use manus.ai recommended selectors
    const selectors = this.getEnhancedSelectors(platform);
    const listingCount = this.countListings(html, selectors);
    
    console.log(`🔍 ${platform} enhanced analysis: ${listingCount} listings found`);
    
    if (listingCount === 0) {
      return {
        status: "no_match",
        count: 0,
        message: "No listings found in search area"
      };
    }

    // Enhanced postcode validation
    const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
    const hasPostcodeMatch = postcodeRegex.test(html);
    const hasStreetMatch = streetName ? html.toLowerCase().includes(streetName.toLowerCase()) : false;
    
    // Confidence scoring
    let confidence = "Low";
    if (hasStreetMatch) {
      confidence = "High";
    } else if (hasPostcodeMatch) {
      confidence = "Medium";
    }

    return {
      status: "investigate",
      count: listingCount,
      confidence,
      message: `Found ${listingCount} listings with ${confidence.toLowerCase()} confidence`
    };
  }

  private detectBlocking(html: string, platform: string): boolean {
    const blockingPatterns = {
      airbnb: [
        'Please verify you are a human',
        'Access to this page has been denied',
        'captcha',
        'challenge-platform'
      ],
      spareroom: [
        'Please verify you are a human',
        'Access denied',
        'Too many requests'
      ],
      gumtree: [
        'Access to this page has been denied',
        'Please complete the security check',
        'unusual traffic'
      ]
    };

    const patterns = blockingPatterns[platform as keyof typeof blockingPatterns] || [];
    return patterns.some(pattern => html.toLowerCase().includes(pattern.toLowerCase()));
  }

  private getEnhancedSelectors(platform: string): { primary: string; backup: string[] } {
    switch (platform) {
      case 'airbnb':
        return {
          primary: 'div.lxq01kf',
          backup: ['[data-testid="card-container"]', '[data-testid="listing-card"]', '.t1jojoys']
        };
      case 'spareroom':
        return {
          primary: '.listing-results-content.desktop',
          backup: ['.listing-result', '[id^="listing-"]', '.listingResult']
        };
      case 'gumtree':
        return {
          primary: 'article[data-q="listing"]',
          backup: ['.listing-link', '.natural', '[class*="listing"]']
        };
      default:
        return { primary: '.listing', backup: ['.result', '.item'] };
    }
  }

  private countListings(html: string, selectors: { primary: string; backup: string[] }): number {
    // Try primary selector first
    let matches = (html.match(new RegExp(selectors.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    
    // Fall back to backup selectors if primary fails
    if (matches === 0) {
      for (const backup of selectors.backup) {
        matches = (html.match(new RegExp(backup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        if (matches > 0) break;
      }
    }
    
    return matches;
  }

  // Circuit breaker implementation
  private isCircuitBreakerOpen(platform: string): boolean {
    const breaker = this.circuitBreakers.get(platform);
    if (!breaker) return false;
    
    if (breaker.isOpen) {
      const cooldownPeriods = { airbnb: 2 * 60 * 60 * 1000, spareroom: 60 * 60 * 1000, gumtree: 30 * 60 * 1000 };
      const cooldown = cooldownPeriods[platform as keyof typeof cooldownPeriods] || 60 * 60 * 1000;
      
      if (Date.now() - breaker.lastFailure > cooldown) {
        breaker.isOpen = false;
        breaker.failures = 0;
        console.log(`🔄 Circuit breaker reset for ${platform}`);
      }
    }
    
    return breaker.isOpen;
  }

  private recordFailure(platform: string): void {
    const thresholds = { airbnb: 3, spareroom: 5, gumtree: 7 };
    const threshold = thresholds[platform as keyof typeof thresholds] || 5;
    
    if (!this.circuitBreakers.has(platform)) {
      this.circuitBreakers.set(platform, { failures: 0, lastFailure: 0, isOpen: false });
    }
    
    const breaker = this.circuitBreakers.get(platform)!;
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= threshold) {
      breaker.isOpen = true;
      console.log(`🚫 Circuit breaker OPENED for ${platform} (${breaker.failures} failures)`);
    }
  }

  private resetFailures(platform: string): void {
    if (this.circuitBreakers.has(platform)) {
      this.circuitBreakers.get(platform)!.failures = 0;
    }
  }

  private getFailureCount(platform: string): number {
    return this.circuitBreakers.get(platform)?.failures || 0;
  }

  // Credit management
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

  // Rate limiting
  private canMakeRequest(platform: string): boolean {
    const now = Date.now();
    const platformCount = this.requestCounts[platform as keyof typeof this.requestCounts];
    
    // Reset hourly counter if needed
    if (now - platformCount.lastHourReset > 60 * 60 * 1000) {
      platformCount.hourly = 0;
      platformCount.lastHourReset = now;
    }
    
    const limits = this.platformLimits[platform as keyof typeof this.platformLimits];
    return platformCount.daily < limits.daily && platformCount.hourly < limits.hourly;
  }

  private updateRequestCounts(platform: string): void {
    const platformCount = this.requestCounts[platform as keyof typeof this.requestCounts];
    platformCount.daily++;
    platformCount.hourly++;
  }

  private async waitBetweenRequests(type: 'platform' | 'batch'): Promise<void> {
    const delays = {
      platform: { min: 3000, max: 8000 },
      batch: { min: 1000, max: 2000 }
    };
    
    const delay = delays[type];
    const waitTime = Math.random() * (delay.max - delay.min) + delay.min;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  private isProblematicPostcode(postcode: string): boolean {
    // London and major city centers tend to have more blocking
    const problematicPrefixes = ['SW1', 'W1', 'EC', 'WC', 'E1', 'SE1', 'NW1', 'N1'];
    return problematicPrefixes.some(prefix => postcode.startsWith(prefix));
  }

  private getCreditUsageStats(): CreditUsageStats {
    return {
      totalCreditsUsed: this.creditUsage.total,
      premiumRequestsUsed: Math.floor(this.creditUsage.premium / 10),
      standardRequestsUsed: Math.floor(this.creditUsage.standard / 5),
      dailyBudgetRemaining: this.dailyBudget - this.creditUsage.total,
      costBreakdown: {
        airbnb: this.requestCounts.airbnb.daily * 25,
        spareroom: this.requestCounts.spareroom.daily * 8, // Average of premium/standard
        gumtree: this.requestCounts.gumtree.daily * 6
      }
    };
  }

  private getCircuitBreakerStatus(): CircuitBreakerStatus {
    return {
      airbnb: {
        isOpen: this.circuitBreakers.get('airbnb')?.isOpen || false,
        failures: this.circuitBreakers.get('airbnb')?.failures || 0
      },
      spareroom: {
        isOpen: this.circuitBreakers.get('spareroom')?.isOpen || false,
        failures: this.circuitBreakers.get('spareroom')?.failures || 0
      },
      gumtree: {
        isOpen: this.circuitBreakers.get('gumtree')?.isOpen || false,
        failures: this.circuitBreakers.get('gumtree')?.failures || 0
      }
    };
  }

  private generateEnhancedRecommendations(successRate: number, testResults: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    if (successRate < 30) {
      recommendations.push("🔧 Success rate critically low - review circuit breaker thresholds and proxy configurations");
      recommendations.push("💰 Consider increasing premium proxy usage for problematic postcodes");
    } else if (successRate < 50) {
      recommendations.push("⚡ Moderate success rate - fine-tune platform-specific configurations");
      recommendations.push("🎯 Focus credit allocation on highest-performing platforms");
    } else if (successRate >= 70) {
      recommendations.push("✅ Excellent success rate - system optimized for production deployment");
      recommendations.push("📈 Consider expanding to additional platforms or postcodes");
    }

    // Credit efficiency recommendations
    const creditEfficiency = this.creditUsage.total > 0 ? (testResults.length / this.creditUsage.total) * 100 : 0;
    if (creditEfficiency < 0.5) {
      recommendations.push("💸 Credit efficiency low - reduce premium proxy usage for low-priority areas");
    }

    // Platform-specific recommendations
    const airbnbSuccess = testResults.filter(r => r.airbnb.status === 'investigate').length;
    const spareroomSuccess = testResults.filter(r => r.spareroom.status === 'investigate').length;
    const gumtreeSuccess = testResults.filter(r => r.gumtree.status === 'investigate').length;

    if (airbnbSuccess < testResults.length * 0.3) {
      recommendations.push("🏠 Airbnb success rate low - consider increasing stealth proxy usage");
    }
    if (spareroomSuccess < testResults.length * 0.4) {
      recommendations.push("🏢 SpareRoom blocking detected - implement longer delays between requests");
    }
    if (gumtreeSuccess < testResults.length * 0.5) {
      recommendations.push("📱 Gumtree performance poor - review cookie handling and user-agent rotation");
    }

    return recommendations;
  }
}

export async function runEnhancedScrapingBeeTests(postcodes: PostcodeResult[]): Promise<EnhancedScrapingBeeResults> {
  const runner = new EnhancedScrapingBeeRunner();
  return await runner.runEnhancedTests(postcodes);
}
