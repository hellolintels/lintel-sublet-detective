
import { PostcodeResult } from './types.ts';
import { EnhancedResultClassifier } from './enhanced-result-classifier.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

export class EnhancedScrapingBeeClient {
  private resultClassifier = new EnhancedResultClassifier();
  private requestCount = 0;
  private dailyLimit = 100; // Conservative limit for testing
  
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
      console.log(`🔍 ScrapingBee enhanced request for ${platform}: ${postcodeData.postcode}`);
      console.log(`📡 Target URL: ${url}`);
      
      // Enhanced ScrapingBee configuration
      const scrapingBeeConfig = this.getEnhancedConfig(platform);
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
      
      // Count listings using platform-specific selectors
      const listingCount = this.countListings(html, platform);
      console.log(`🏠 Listings detected: ${listingCount}`);
      
      // Enhanced classification with location validation
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
      console.error(`❌ Enhanced scraping failed for ${platform}:`, error);
      
      return {
        status: "error",
        count: 0,
        message: error.message,
        responseTime,
        url
      };
    }
  }
  
  private getEnhancedConfig(platform: string): string {
    const baseConfig = "render_js=true&wait=3000&premium_proxy=true&country_code=GB";
    
    switch (platform) {
      case 'airbnb':
        return `${baseConfig}&stealth_proxy=true&session_id=airbnb_session`;
      case 'spareroom':
        return `${baseConfig}&block_ads=true&session_id=spareroom_session`;
      case 'gumtree':
        return `${baseConfig}&block_ads=true&session_id=gumtree_session`;
      default:
        return baseConfig;
    }
  }
  
  private countListings(html: string, platform: string): number {
    const selectors = {
      airbnb: [
        'div[data-testid="card-container"]',
        'div.t1jojoys',
        'div.lxq01kf'
      ],
      spareroom: [
        '.listing-result',
        '[id^="listing-"]',
        '.listingResult'
      ],
      gumtree: [
        'article[data-q="listing"]',
        '.listing-link',
        '.natural'
      ]
    };
    
    const platformSelectors = selectors[platform as keyof typeof selectors] || ['.listing'];
    
    for (const selector of platformSelectors) {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = (html.match(new RegExp(escapedSelector, 'gi')) || []).length;
      if (matches > 0) {
        return matches;
      }
    }
    
    return 0;
  }
  
  private getCreditCost(platform: string): number {
    // Premium proxy costs
    switch (platform) {
      case 'airbnb': return 25; // Stealth proxy
      case 'spareroom': return 10; // Premium proxy
      case 'gumtree': return 10; // Premium proxy
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
