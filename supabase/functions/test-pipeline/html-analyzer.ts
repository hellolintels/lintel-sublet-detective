
import { PostcodeResult } from './types.ts';
import { URLGenerators } from './url-generators.ts';

export class HTMLAnalyzer {
  static analyzeForVerificationLinks(html: string, postcodeData: PostcodeResult, platform: string, url: string) {
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
      const mapViewUrl = URLGenerators.generateMapViewUrl(platform, postcodeData);
      return {
        status: "no_match",
        count: 0,
        message: "No listings found in search area",
        map_view_url: mapViewUrl
      };
    }

    const listingUrl = URLGenerators.extractFirstListingUrl(html, platform, postcodeData);
    
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

  private static detectBlocking(html: string, platform: string): boolean {
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

  private static getEnhancedSelectors(platform: string): { primary: string; backup: string[] } {
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

  private static countListings(html: string, selectors: { primary: string; backup: string[] }): number {
    let matches = (html.match(new RegExp(selectors.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    
    if (matches === 0) {
      for (const backup of selectors.backup) {
        matches = (html.match(new RegExp(backup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        if (matches > 0) break;
      }
    }
    
    return matches;
  }
}
