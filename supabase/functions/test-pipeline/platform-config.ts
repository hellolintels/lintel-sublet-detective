
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

  private isProblematicPostcode(postcode: string): boolean {
    const problematicPrefixes = ['SW1', 'W1', 'EC', 'WC', 'E1', 'SE1', 'NW1', 'N1'];
    return problematicPrefixes.some(prefix => postcode.startsWith(prefix));
  }
}
