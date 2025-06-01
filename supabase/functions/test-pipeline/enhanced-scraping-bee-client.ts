
import { PostcodeResult } from './types.ts';
import { BinaryResultClassifier } from './binary-result-classifier.ts';
import { EnhancedScrapingBeeConfig } from './enhanced-scraping-bee-config.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

export class EnhancedScrapingBeeClient {
  private binaryClassifier = new BinaryResultClassifier();
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
      console.log(`🔍 EXACT MATCH ScrapingBee request for ${platform}: ${postcodeData.postcode}`);
      console.log(`📡 Target URL: ${url}`);
      
      // Use manus.ai's optimized ScrapingBee configuration
      const scrapingBeeUrl = EnhancedScrapingBeeConfig.buildScrapingBeeUrl(
        SCRAPINGBEE_API_KEY, 
        url, 
        platform
      );
      
      console.log(`🚀 Making ScrapingBee request...`);
      const response = await fetch(scrapingBeeUrl);
      const responseTime = Date.now() - startTime;
      this.requestCount++;
      
      console.log(`📊 ScrapingBee response: ${response.status} ${response.statusText} (${responseTime}ms)`);
      console.log(`💳 Credit cost: ${EnhancedScrapingBeeConfig.getCreditCost(platform)} credits`);
      console.log(`📈 Requests used: ${this.requestCount}/${this.dailyLimit}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ScrapingBee API error for ${platform}:`, errorText);
        throw new Error(`ScrapingBee API error: ${response.status} - ${errorText}`);
      }
      
      const html = await response.text();
      console.log(`📄 HTML received: ${html.length} characters`);
      console.log(`📝 HTML preview: ${html.substring(0, 200)}...`);
      
      // Apply manus.ai's binary classification (INVESTIGATE or NO_MATCH only)
      const result = this.binaryClassifier.classifyResult(
        html,
        postcodeData,
        platform,
        url
      );
      
      console.log(`🎯 Final classification for ${platform}: ${result.status}`);
      console.log(`📋 Result message: ${result.message}`);
      
      return {
        ...result,
        responseTime,
        credit_cost: EnhancedScrapingBeeConfig.getCreditCost(platform),
        requests_remaining: this.dailyLimit - this.requestCount
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Exact match scraping failed for ${platform}:`, error);
      
      return {
        status: "error",
        count: 0,
        message: error.message,
        responseTime,
        url,
        search_method: "scraping-error",
        precision: "failed"
      };
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
