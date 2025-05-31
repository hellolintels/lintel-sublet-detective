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
  private dailyBudget = 800;
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
    console.log(`🔍 Starting Property Search Verification for ${postcodes.length} postcodes`);
    
    if (!SCRAPINGBEE_API_KEY) {
      throw new Error("ScrapingBee API key not configured");
    }

    const postcodeGroups = this.groupPostcodesByArea(postcodes);
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
    const circuitBreakerStatus = this.getCircuitBreakerStatus();
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

  private groupPostcodesByArea(postcodes: PostcodeResult[]): PostcodeGroup[] {
    const groups = new Map<string, PostcodeResult[]>();
    
    postcodes.forEach(postcode => {
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
    if (area.startsWith('EH') || area.startsWith('G')) return 'high';
    if (area.match(/^[ENSW][0-9]/)) return 'high';
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

    for (const postcodeData of group.postcodes) {
      console.log(`\n📍 Processing ${postcodeData.postcode} for verification`);
      
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
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
      await this.waitBetweenRequests('batch');
    }

    return { results, responseTimes, successCount, totalRequests };
  }

  private async testPlatformForVerification(postcodeData: PostcodeResult, platform: string) {
    if (this.isCircuitBreakerOpen(platform)) {
      console.log(`🚫 Circuit breaker open for ${platform}, skipping request`);
      return {
        status: "error",
        count: 0,
        message: `Circuit breaker open for ${platform}`,
        responseTime: 0
      };
    }

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
      
      console.log(`🔍 Testing ${platform} for ${postcodeData.postcode} (verification focus)`);
      
      const scrapingBeeUrl = this.buildScrapingBeeUrl(url, config.params);
      const response = await fetch(scrapingBeeUrl);
      const responseTime = Date.now() - startTime;
      
      this.updateCreditUsage(platform, config.params.premium_proxy === 'true');
      this.updateRequestCounts(platform);

      console.log(`📊 ${platform} response: ${response.status} (${responseTime}ms)`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.recordFailure(platform);
        throw new Error(`ScrapingBee API error: ${response.status} - ${errorText}`);
      }
      
      const html = await response.text();
      const result = this.analyzeForVerificationLinks(html, postcodeData, platform, url, config);
      
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

  private analyzeForVerificationLinks(html: string, postcodeData: PostcodeResult, platform: string, url: string, config: any) {
    const { postcode, streetName } = postcodeData;
    
    if (this.detectBlocking(html, platform)) {
      return {
        status: "error",
        count: 0,
        message: `${platform} blocking detected`
      };
    }

    const selectors = this.getEnhancedSelectors(platform);
    const listingCount = this.countListings(html, selectors);
    
    console.log(`🔍 ${platform} verification analysis: ${listingCount} listings found`);
    
    if (listingCount === 0) {
      // Generate map view URL for verification
      const mapViewUrl = this.generateMapViewUrl(platform, postcodeData);
      return {
        status: "no_match",
        count: 0,
        message: "No listings found in search area",
        map_view_url: mapViewUrl
      };
    }

    // Extract first listing URL for verification
    const listingUrl = this.extractFirstListingUrl(html, platform, postcodeData);
    
    const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
    const hasPostcodeMatch = postcodeRegex.test(html);
    const hasStreetMatch = streetName ? html.toLowerCase().includes(streetName.toLowerCase()) : false;
    
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
      message: `Found ${listingCount} listings requiring verification`,
      listing_url: listingUrl
    };
  }

  private generateMapViewUrl(platform: string, postcodeData: PostcodeResult): string {
    const { postcode, latitude, longitude } = postcodeData;
    
    switch (platform) {
      case 'airbnb':
        if (latitude && longitude) {
          const radiusDelta = 0.002; // Small radius to show postcode area
          const swLat = latitude - radiusDelta;
          const swLng = longitude - radiusDelta;
          const neLat = latitude + radiusDelta;
          const neLng = longitude + radiusDelta;
          return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}&zoom=16&search_by_map=true`;
        }
        return `https://www.airbnb.com/s/${encodeURIComponent(postcode)}/homes?refinement_paths%5B%5D=%2Fhomes`;
      
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(postcode)}&mode=map`;
      
      case 'gumtree':
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(postcode)}&search_category=property-to-rent&search_scope=false&photos_filter=false&map_view=true`;
      
      default:
        return '';
    }
  }

  private extractFirstListingUrl(html: string, platform: string, postcodeData: PostcodeResult): string {
    const { postcode } = postcodeData;
    
    switch (platform) {
      case 'airbnb':
        // Extract first listing URL from Airbnb HTML
        const airbnbMatch = html.match(/href="\/rooms\/(\d+)[^"]*"/);
        if (airbnbMatch) {
          return `https://www.airbnb.com/rooms/${airbnbMatch[1]}`;
        }
        return `https://www.airbnb.com/s/${encodeURIComponent(postcode)}/homes`;
      
      case 'spareroom':
        // Extract first SpareRoom listing
        const spareroomMatch = html.match(/href="[^"]*flatshare_detail\.pl\?flatshare_id=(\d+)[^"]*"/);
        if (spareroomMatch) {
          return `https://www.spareroom.co.uk/flatshare/flatshare_detail.pl?flatshare_id=${spareroomMatch[1]}`;
        }
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(postcode)}`;
      
      case 'gumtree':
        // Extract first Gumtree ad
        const gumtreeMatch = html.match(/href="[^"]*\/ad\/(\d+)[^"]*"/);
        if (gumtreeMatch) {
          return `https://www.gumtree.com/p/${gumtreeMatch[1]}`;
        }
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(postcode)}&search_category=property-to-rent`;
      
      default:
        return '';
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
          creditCost: 25,
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
    
    if (address && address.length > postcode.length + 10) {
      return address;
    }
    
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
    let matches = (html.match(new RegExp(selectors.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    
    if (matches === 0) {
      for (const backup of selectors.backup) {
        matches = (html.match(new RegExp(backup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        if (matches > 0) break;
      }
    }
    
    return matches;
  }

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

  private canMakeRequest(platform: string): boolean {
    const now = Date.now();
    const platformCount = this.requestCounts[platform as keyof typeof this.requestCounts];
    
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
        spareroom: this.requestCounts.spareroom.daily * 8,
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
