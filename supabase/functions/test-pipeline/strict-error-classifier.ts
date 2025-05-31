
export interface ErrorClassification {
  type: 'no_results' | 'blocked' | 'loading_issues' | 'normal';
  confidence: number;
  indicators: string[];
  recommendation: string;
}

export class StrictErrorClassifier {
  
  classifyResponse(html: string, platform: string, url: string): ErrorClassification {
    const htmlLower = html.toLowerCase();
    const indicators: string[] = [];
    
    // Check for blocking patterns (highest priority)
    const blockingPatterns = [
      'captcha', 'please verify you are a human', 'access denied',
      'too many requests', 'rate limit', 'temporarily unavailable',
      'cloudflare', 'security check', 'unusual traffic', 'blocked'
    ];
    
    for (const pattern of blockingPatterns) {
      if (htmlLower.includes(pattern)) {
        indicators.push(`Blocking: ${pattern}`);
        return {
          type: 'blocked',
          confidence: 0.95,
          indicators,
          recommendation: `🚫 ${platform} is blocking requests - implement delays and stealth mode`
        };
      }
    }
    
    // Check for loading issues
    if (html.length < 1000) {
      indicators.push(`Very short response: ${html.length} chars`);
      return {
        type: 'loading_issues',
        confidence: 0.9,
        indicators,
        recommendation: `⚠️ ${platform} returned incomplete response - check network/timeout issues`
      };
    }
    
    // Check for explicit "no results" messaging
    const noResultsPatterns = [
      'no results', 'no properties found', 'no listings',
      'nothing found', '0 results', 'no matches'
    ];
    
    for (const pattern of noResultsPatterns) {
      if (htmlLower.includes(pattern)) {
        indicators.push(`No results: ${pattern}`);
        return {
          type: 'no_results',
          confidence: 0.85,
          indicators,
          recommendation: `✅ ${platform} confirmed no properties in this area`
        };
      }
    }
    
    // Platform-specific validation
    const platformValidation = this.validatePlatformStructure(html, platform);
    if (!platformValidation.isValid) {
      return {
        type: 'loading_issues',
        confidence: 0.8,
        indicators: platformValidation.issues,
        recommendation: `⚠️ ${platform} page structure invalid - possible loading issues`
      };
    }
    
    return {
      type: 'normal',
      confidence: 0.9,
      indicators: ['Page loaded normally'],
      recommendation: `✅ ${platform} response appears valid`
    };
  }
  
  private validatePlatformStructure(html: string, platform: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const htmlLower = html.toLowerCase();
    
    switch (platform) {
      case 'airbnb':
        if (!htmlLower.includes('airbnb')) {
          issues.push('Missing Airbnb branding');
        }
        break;
      case 'spareroom':
        if (!htmlLower.includes('spareroom')) {
          issues.push('Missing SpareRoom branding');
        }
        break;
      case 'gumtree':
        if (!htmlLower.includes('gumtree')) {
          issues.push('Missing Gumtree branding');
        }
        break;
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
