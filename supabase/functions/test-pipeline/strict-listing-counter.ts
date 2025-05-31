
export class StrictListingCounter {
  
  /**
   * Updated CSS selectors based on manus.ai research
   */
  private getStrictSelectors(platform: string): { primary: string; fallbacks: string[] } {
    switch (platform) {
      case 'airbnb':
        return {
          primary: 'div[data-testid="card-container"]',
          fallbacks: ['div.t1jojoys', 'div.lxq01kf', '[data-testid="listing-card"]']
        };
      case 'spareroom':
        return {
          primary: '.listing-result',
          fallbacks: ['[id^="listing-"]', '.listingResult', '.ad-title']
        };
      case 'gumtree':
        return {
          // Updated selector based on manus.ai research
          primary: 'article[data-q="search-result"]',
          fallbacks: ['article[data-q="listing"]', '.listing-link', '.natural']
        };
      default:
        return { primary: '.listing', fallbacks: ['.result', '.item'] };
    }
  }
  
  /**
   * Count listings with strict validation
   */
  countListings(html: string, platform: string): number {
    const selectors = this.getStrictSelectors(platform);
    
    // Try primary selector first
    let count = this.countBySelector(html, selectors.primary);
    
    if (count === 0) {
      // Try fallback selectors
      for (const fallback of selectors.fallbacks) {
        count = this.countBySelector(html, fallback);
        if (count > 0) {
          console.log(`📍 ${platform}: Found ${count} listings using fallback selector: ${fallback}`);
          break;
        }
      }
    } else {
      console.log(`📍 ${platform}: Found ${count} listings using primary selector: ${selectors.primary}`);
    }
    
    // Filter out promoted/sponsored listings for more accurate count
    return this.filterOrganicListings(count, html, platform);
  }
  
  private countBySelector(html: string, selector: string): number {
    try {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = html.match(new RegExp(escapedSelector, 'gi'));
      return matches ? matches.length : 0;
    } catch (e) {
      console.warn(`⚠️ Selector failed: ${selector}`, e.message);
      return 0;
    }
  }
  
  /**
   * Filter out promoted/sponsored listings for more accurate organic count
   */
  private filterOrganicListings(totalCount: number, html: string, platform: string): number {
    if (totalCount === 0) return 0;
    
    // Count promoted/sponsored indicators
    const promotedPatterns = [
      'sponsored', 'promoted', 'featured', 'ad-listing',
      'premium', 'highlight', 'boost'
    ];
    
    let promotedCount = 0;
    for (const pattern of promotedPatterns) {
      const matches = html.match(new RegExp(pattern, 'gi'));
      if (matches) {
        promotedCount += matches.length;
      }
    }
    
    // Estimate organic listings (conservative approach)
    const organicCount = Math.max(0, totalCount - Math.floor(promotedCount * 0.8));
    
    if (promotedCount > 0) {
      console.log(`📊 ${platform}: ${totalCount} total, ~${promotedCount} promoted, ~${organicCount} organic`);
    }
    
    return organicCount;
  }
}
