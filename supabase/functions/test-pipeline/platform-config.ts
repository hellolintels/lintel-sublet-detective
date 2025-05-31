
import { PostcodeResult } from './types.ts';
import { PlatformConfig } from './enhanced-types.ts';

export class PlatformConfigManager {
  private failureCounts: Map<string, number> = new Map();

  constructor() {
    this.failureCounts.set('airbnb', 0);
    this.failureCounts.set('spareroom', 0);
    this.failureCounts.set('gumtree', 0);
  }

  updateFailureCount(platform: string, count: number): void {
    this.failureCounts.set(platform, count);
  }

  getFailureCount(platform: string): number {
    return this.failureCounts.get(platform) || 0;
  }

  getPlatformConfig(platform: string, postcodeData: PostcodeResult): PlatformConfig {
    const isProblematicArea = this.isProblematicPostcode(postcodeData.postcode);
    
    switch (platform) {
      case 'airbnb':
        return {
          params: {
            premium_proxy: 'true',
            stealth_proxy: 'true',
            block_ads: 'true',
            wait: '8000',
            wait_browser: 'load',
            country_code: 'gb',
            render_js: 'true'
          },
          creditCost: 25,
          description: 'Premium+Stealth (Max Protection)'
        };
      
      case 'spareroom':
        // Always use premium for anti-blocking
        return {
          params: {
            premium_proxy: 'true',
            stealth_proxy: 'true',
            wait: '5000',
            country_code: 'gb',
            render_js: 'true',
            block_ads: 'true'
          },
          creditCost: 10,
          description: 'Premium+Stealth (Anti-Block)'
        };
      
      case 'gumtree':
        // Use premium and remove problematic cookies
        return {
          params: {
            premium_proxy: 'true',
            stealth_proxy: 'true',
            wait: '4000',
            country_code: 'gb',
            render_js: 'true',
            block_ads: 'true'
            // Removed 'cookies' parameter that was causing 400 errors
          },
          creditCost: 10,
          description: 'Premium+Stealth (Fixed Cookies)'
        };
      
      default:
        return {
          params: { 
            render_js: 'true', 
            wait: '3000',
            premium_proxy: 'true'
          },
          creditCost: 10,
          description: 'Premium Default'
        };
    }
  }

  private isProblematicPostcode(postcode: string): boolean {
    const problematicPrefixes = ['SW1', 'W1', 'EC', 'WC', 'E1', 'SE1', 'NW1', 'N1'];
    return problematicPrefixes.some(prefix => postcode.startsWith(prefix));
  }
}
