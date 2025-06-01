
import { PostcodeResult, ScrapingResult } from './types.ts';
import { ExactPostcodeValidator } from './exact-postcode-validator.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

/**
 * Manus.ai's binary classification: INVESTIGATE or NO_MATCH only
 * Zero false positives through exact postcode matching
 */
export class BinaryResultClassifier {
  private exactValidator = new ExactPostcodeValidator();
  
  classifyResult(
    html: string,
    postcodeData: PostcodeResult,
    platform: string,
    url: string
  ): ScrapingResult {
    console.log(`🎯 Binary classification starting for ${platform} - ${postcodeData.postcode}`);
    console.log(`📄 HTML length: ${html.length} characters`);
    
    // Step 1: Check for blocking/errors first
    if (this.isBlocked(html, platform)) {
      console.log(`🚫 ${platform} is blocking requests`);
      return {
        status: "error",
        count: 0,
        message: `${platform} is blocking automated requests`,
        url,
        search_method: "blocked",
        precision: "failed"
      };
    }
    
    // Step 2: Check for loading issues
    if (this.hasLoadingIssues(html, platform)) {
      console.log(`⚠️ ${platform} has loading issues`);
      return {
        status: "error",
        count: 0,
        message: `${platform} page loading issues detected`,
        url,
        search_method: "loading-error",
        precision: "failed"
      };
    }
    
    // Step 3: Check for explicit "no results"
    if (this.hasNoResultsMessage(html, platform)) {
      console.log(`✅ ${platform} explicitly shows no results`);
      return {
        status: "no_match",
        count: 0,
        message: "Platform confirmed no properties in search area",
        url,
        map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
        search_method: "confirmed-no-results",
        precision: "high"
      };
    }
    
    // Step 4: Count listings
    const listingCount = this.countListings(html, platform);
    console.log(`📊 Found ${listingCount} listings on ${platform}`);
    
    if (listingCount === 0) {
      console.log(`❌ No listings found on ${platform}`);
      return {
        status: "no_match",
        count: 0,
        message: "No listings found in search area",
        url,
        map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
        search_method: "no-listings-found",
        precision: "high"
      };
    }
    
    // Step 5: EXACT POSTCODE VALIDATION (manus.ai binary approach)
    const hasExactMatch = this.exactValidator.isExactMatch(html, postcodeData.postcode, platform);
    
    if (hasExactMatch) {
      console.log(`🎯 EXACT MATCH CONFIRMED for ${postcodeData.postcode} on ${platform}`);
      return {
        status: "investigate",
        count: listingCount,
        message: `EXACT MATCH: Found ${listingCount} properties in ${postcodeData.postcode}`,
        url,
        listing_url: HyperlinkGenerator.generateListingUrl(platform, postcodeData),
        search_method: "exact-postcode-match",
        precision: "high",
        confidence: "High"
      };
    } else {
      console.log(`❌ NO EXACT MATCH for ${postcodeData.postcode} on ${platform} (found ${listingCount} listings but wrong location)`);
      return {
        status: "no_match",
        count: 0,
        message: `Found ${listingCount} listings but NO EXACT postcode match - likely different area`,
        url,
        map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
        search_method: "listings-wrong-location",
        precision: "high"
      };
    }
  }
  
  private isBlocked(html: string, platform: string): boolean {
    const blockingPatterns = [
      'captcha', 'please verify you are a human', 'access denied',
      'too many requests', 'rate limit', 'temporarily unavailable',
      'cloudflare', 'security check', 'unusual traffic', 'blocked',
      'forbidden', 'please complete the security check'
    ];
    
    const htmlLower = html.toLowerCase();
    for (const pattern of blockingPatterns) {
      if (htmlLower.includes(pattern)) {
        console.log(`🚫 Blocking detected for ${platform}: "${pattern}"`);
        return true;
      }
    }
    return false;
  }
  
  private hasLoadingIssues(html: string, platform: string): boolean {
    // Very short response indicates loading issues
    if (html.length < 1000) {
      console.log(`⚠️ Loading issue for ${platform}: Very short response (${html.length} chars)`);
      return true;
    }
    
    // Check for platform branding to ensure page loaded correctly
    const platformBranding = {
      airbnb: 'airbnb',
      spareroom: 'spareroom',
      gumtree: 'gumtree'
    };
    
    const expectedBranding = platformBranding[platform as keyof typeof platformBranding];
    if (expectedBranding && !html.toLowerCase().includes(expectedBranding)) {
      console.log(`⚠️ Loading issue for ${platform}: Missing platform branding`);
      return true;
    }
    
    return false;
  }
  
  private hasNoResultsMessage(html: string, platform: string): boolean {
    const noResultsPatterns = [
      'no results', 'no properties found', 'no listings',
      'nothing found', '0 results', 'no matches found',
      'sorry, no results', 'no properties available'
    ];
    
    const htmlLower = html.toLowerCase();
    for (const pattern of noResultsPatterns) {
      if (htmlLower.includes(pattern)) {
        console.log(`✅ No results message found for ${platform}: "${pattern}"`);
        return true;
      }
    }
    return false;
  }
  
  private countListings(html: string, platform: string): number {
    const selectors = {
      airbnb: ['div[data-testid="card-container"]', 'div.t1jojoys', 'div.lxq01kf'],
      spareroom: ['.listing-result', '[id^="listing-"]', '.listingResult'],
      gumtree: ['article[data-q="search-result"]', 'article[data-q="listing"]', '.listing-link']
    };
    
    const platformSelectors = selectors[platform as keyof typeof selectors] || ['.listing'];
    
    for (const selector of platformSelectors) {
      try {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = html.match(new RegExp(escapedSelector, 'gi'));
        const count = matches ? matches.length : 0;
        
        if (count > 0) {
          console.log(`📊 ${platform}: Found ${count} listings using selector: ${selector}`);
          return count;
        }
      } catch (e) {
        console.warn(`⚠️ Selector failed for ${platform}: ${selector}`, e.message);
      }
    }
    
    console.log(`❌ ${platform}: No listings found with any selector`);
    return 0;
  }
}
