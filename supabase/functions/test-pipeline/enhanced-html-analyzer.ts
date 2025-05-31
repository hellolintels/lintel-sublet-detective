
import { PostcodeResult } from './types.ts';
import { LocationValidator, LocationValidationResult } from './location-validator.ts';

export class EnhancedHTMLAnalyzer {
  private locationValidator = new LocationValidator();

  analyzeForAccurateVerificationLinks(
    html: string, 
    postcodeData: PostcodeResult, 
    platform: string, 
    url: string
  ) {
    const { postcode, streetName } = postcodeData;
    
    // First check for blocking
    if (this.detectBlocking(html, platform)) {
      return {
        status: "error",
        count: 0,
        confidence: "None",
        message: `${platform} blocking detected`,
        accuracy: "blocked"
      };
    }

    // Get basic listing count
    const selectors = this.getEnhancedSelectors(platform);
    const listingCount = this.countListings(html, selectors);
    
    console.log(`🔍 ${platform} enhanced analysis: ${listingCount} listings found for ${postcode}`);
    
    if (listingCount === 0) {
      return {
        status: "no_match",
        count: 0,
        confidence: "High",
        message: "No listings found in search area - verified accurate",
        accuracy: "high"
      };
    }

    // Enhanced location validation
    const locationValidation = this.locationValidator.validateLocationMatch(
      html, 
      postcodeData, 
      platform
    );

    return this.classifyResultWithAccuracy(
      listingCount, 
      locationValidation, 
      postcodeData, 
      platform, 
      url
    );
  }

  private classifyResultWithAccuracy(
    listingCount: number,
    locationValidation: LocationValidationResult,
    postcodeData: PostcodeResult,
    platform: string,
    url: string
  ) {
    const { isValid, confidence, reasons, extractedPostcode, distanceFromTarget } = locationValidation;
    
    // Determine confidence level
    let confidenceLevel = "Low";
    let accuracy = "low";
    
    if (confidence >= 80) {
      confidenceLevel = "High";
      accuracy = "high";
    } else if (confidence >= 60) {
      confidenceLevel = "Medium";
      accuracy = "medium";
    }
    
    // Generate detailed message
    const reasonsText = reasons.length > 0 ? ` (${reasons.join(', ')})` : '';
    let message = `Found ${listingCount} listings with ${confidenceLevel.toLowerCase()} location accuracy${reasonsText}`;
    
    if (extractedPostcode) {
      message += `. Detected postcode: ${extractedPostcode}`;
    }
    
    if (distanceFromTarget !== undefined && distanceFromTarget > 2) {
      message += `. Warning: ${distanceFromTarget.toFixed(1)}km from target location`;
    }
    
    // Classification logic with enhanced accuracy
    if (isValid && confidence >= 60) {
      return {
        status: "investigate",
        count: listingCount,
        confidence: confidenceLevel,
        message,
        accuracy,
        validation_score: confidence,
        extracted_postcode: extractedPostcode,
        distance_km: distanceFromTarget,
        listing_url: this.generateListingUrl(platform, postcodeData)
      };
    } else if (listingCount > 0 && confidence < 60) {
      return {
        status: "no_match",
        count: 0,
        confidence: "High",
        message: `${listingCount} listings found but location validation failed (${confidence}% confidence) - likely false positives`,
        accuracy: "high",
        validation_score: confidence,
        map_view_url: this.generateMapViewUrl(platform, postcodeData)
      };
    } else {
      return {
        status: "no_match",
        count: 0,
        confidence: "High",
        message: "No valid listings found in target postcode area",
        accuracy: "high"
      };
    }
  }

  private detectBlocking(html: string, platform: string): boolean {
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

  private getEnhancedSelectors(platform: string): { primary: string; backup: string[] } {
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

  private countListings(html: string, selectors: { primary: string; backup: string[] }): number {
    let matches = (html.match(new RegExp(selectors.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    
    if (matches === 0) {
      for (const backup of selectors.backup) {
        matches = (html.match(new RegExp(backup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        if (matches > 0) break;
      }
    }
    
    return matches;
  }

  private generateListingUrl(platform: string, postcodeData: PostcodeResult): string {
    const searchQuery = postcodeData.address || 
      (postcodeData.streetName ? `${postcodeData.streetName}, ${postcodeData.postcode}` : postcodeData.postcode);
    
    switch (platform) {
      case 'airbnb':
        return `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(searchQuery)}`;
      case 'gumtree':
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(searchQuery)}`;
      default:
        return '';
    }
  }

  private generateMapViewUrl(platform: string, postcodeData: PostcodeResult): string {
    if (postcodeData.latitude && postcodeData.longitude) {
      switch (platform) {
        case 'airbnb':
          return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&lat=${postcodeData.latitude}&lng=${postcodeData.longitude}&zoom=15`;
        case 'spareroom':
          return `https://www.spareroom.co.uk/flatshare/?lat=${postcodeData.latitude}&lng=${postcodeData.longitude}`;
        case 'gumtree':
          return `https://www.gumtree.com/search?latitude=${postcodeData.latitude}&longitude=${postcodeData.longitude}`;
        default:
          return '';
      }
    }
    return this.generateListingUrl(platform, postcodeData);
  }
}
