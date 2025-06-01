
/**
 * Enhanced ScrapingBee configuration with manus.ai optimizations
 */
export class EnhancedScrapingBeeConfig {
  
  static getOptimizedConfig(platform: string, url: string): {
    baseParams: Record<string, string>;
    waitForSelector: string;
    additionalParams: Record<string, string>;
  } {
    const baseParams = {
      render_js: 'true',
      premium_proxy: 'true',
      country_code: 'GB',
      block_ads: 'true',
      wait: '3000'
    };
    
    let waitForSelector = '';
    let additionalParams: Record<string, string> = {};
    
    switch (platform) {
      case 'airbnb':
        waitForSelector = 'div[data-testid="card-container"]';
        additionalParams = {
          stealth_proxy: 'true',
          wait: '4000',
          session_id: Date.now().toString()
        };
        console.log(`🏠 Airbnb config: stealth proxy + 4s wait + session isolation`);
        break;
        
      case 'spareroom':
        waitForSelector = '.listing-result';
        additionalParams = {
          wait: '3500'
        };
        console.log(`🏠 SpareRoom config: 3.5s wait for listings`);
        break;
        
      case 'gumtree':
        waitForSelector = 'article[data-q="search-result"]';
        additionalParams = {
          stealth_proxy: 'true',
          wait: '4000'
        };
        console.log(`🏠 Gumtree config: stealth proxy + 4s wait`);
        break;
        
      default:
        waitForSelector = '.listing';
        console.log(`🏠 Default config for unknown platform: ${platform}`);
    }
    
    return {
      baseParams: { ...baseParams, ...additionalParams },
      waitForSelector,
      additionalParams
    };
  }
  
  static buildScrapingBeeUrl(apiKey: string, targetUrl: string, platform: string): string {
    const config = this.getOptimizedConfig(platform, targetUrl);
    
    const params = {
      api_key: apiKey,
      url: targetUrl,
      wait_for: config.waitForSelector,
      ...config.baseParams
    };
    
    const queryString = new URLSearchParams(params).toString();
    const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?${queryString}`;
    
    console.log(`📡 ScrapingBee URL built for ${platform}:`);
    console.log(`   Target: ${targetUrl}`);
    console.log(`   Wait for: ${config.waitForSelector}`);
    console.log(`   Config: ${JSON.stringify(config.baseParams)}`);
    
    return scrapingBeeUrl;
  }
  
  static getCreditCost(platform: string): number {
    switch (platform) {
      case 'airbnb': return 25; // Stealth proxy + JS rendering
      case 'spareroom': return 10; // Premium proxy + JS rendering
      case 'gumtree': return 20; // Stealth proxy + JS rendering
      default: return 15;
    }
  }
}
