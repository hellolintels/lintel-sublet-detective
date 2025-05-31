import { PostcodeResult } from './types.ts';
import { EnhancedResultClassifier } from './enhanced-result-classifier.ts';
import { StrictListingCounter } from './strict-listing-counter.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

export class EnhancedScrapingBeeClient {
  private resultClassifier = new EnhancedResultClassifier();
  private listingCounter = new StrictListingCounter();
  private requestCount = 0;
  private dailyLimit = 100;
  
  async scrapeWithAccuracy(
    url: string,
    postcodeData: PostcodeResult,
    platform: string
  ) {
    if (!SCRAPINGBEE_API_KEY) {
      throw new Error("ScrapingBee API key not configured");
    }
    
    if (this.requestCount >= this.dailyLimit) {
      console.warn(`⚠️ Daily request limit reached (${this.dailyLimit})`);
      return {
        status: "error",
        count: 0,
        message: "Daily request limit reached",
        url
      };
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`🔍 STRICT ScrapingBee request for ${platform}: ${postcodeData.postcode}`);
      console.log(`📡 Target URL: ${url}`);
      
      const scrapingBeeConfig = this.getStrictConfig(platform);
      const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(url)}&${scrapingBeeConfig}`;
      
      const response = await fetch(scrapingBeeUrl);
      const responseTime = Date.now() - startTime;
      this.requestCount++;
      
      console.log(`📊 ScrapingBee response: ${response.status} (${responseTime}ms)`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ScrapingBee error:`, errorText);
        throw new Error(`ScrapingBee API error: ${response.status} - ${errorText}`);
      }
      
      const html = await response.text();
      console.log(`📄 HTML received: ${html.length} characters`);
      
      // Use strict listing counter
      const listingCount = this.listingCounter.countListings(html, platform);
      console.log(`🏠 STRICT count: ${listingCount} listings`);
      
      // Apply strict classification with 95% threshold
      const result = this.resultClassifier.classifyScrapingResult(
        html,
        postcodeData,
        platform,
        listingCount,
        url
      );
      
      return {
        ...result,
        responseTime,
        credit_cost: this.getCreditCost(platform),
        requests_remaining: this.dailyLimit - this.requestCount
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Strict scraping failed for ${platform}:`, error);
      
      return {
        status: "error",
        count: 0,
        message: error.message,
        responseTime,
        url
      };
    }
  }
  
  private getStrictConfig(platform: string): string {
    // Enhanced anti-blocking configuration for strict validation
    const baseConfig = "render_js=true&wait=3000&premium_proxy=true&country_code=GB&block_ads=true&block_resources=false";
    
    switch (platform) {
      case 'airbnb':
        return `${baseConfig}&stealth_proxy=true&session_id=${Date.now()}`;
      case 'spareroom':
        return `${baseConfig}&wait=4000`;
      case 'gumtree':
        return `${baseConfig}&wait=3500&stealth_proxy=true`;
      default:
        return baseConfig;
    }
  }
  
  private getCreditCost(platform: string): number {
    switch (platform) {
      case 'airbnb': return 25; // Stealth proxy
      case 'spareroom': return 10; // Premium proxy
      case 'gumtree': return 15; // Premium + stealth
      default: return 5;
    }
  }
  
  getUsageStats() {
    return {
      requestsUsed: this.requestCount,
      requestsRemaining: this.dailyLimit - this.requestCount,
      dailyLimit: this.dailyLimit
    };
  }
}
