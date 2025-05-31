
import { PostcodeResult, ScrapingResult } from './types.ts';
import { EnhancedLocationValidator, LocationValidationResult } from './enhanced-location-validator.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

export class EnhancedResultClassifier {
  private locationValidator = new EnhancedLocationValidator();
  
  classifyScrapingResult(
    html: string,
    postcodeData: PostcodeResult,
    platform: string,
    listingCount: number,
    url: string
  ): ScrapingResult {
    console.log(`🎯 Enhanced classification for ${platform} - ${postcodeData.postcode}`);
    
    // Check for blocking first
    if (this.isBlocked(html, platform)) {
      return {
        status: "error",
        count: 0,
        message: `${platform} appears to be blocking requests`,
        url,
        search_method: "blocked",
        precision: "failed"
      };
    }
    
    // Check for empty or invalid response
    if (!html || html.length < 500) {
      return {
        status: "error",
        count: 0,
        message: `${platform} returned empty or minimal response`,
        url,
        search_method: "empty-response",
        precision: "failed"
      };
    }
    
    // If no listings found
    if (listingCount === 0) {
      return {
        status: "no_match",
        count: 0,
        message: "No properties found in search area",
        url,
        map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
        search_method: "enhanced-search",
        precision: "high",
        confidence: "High"
      };
    }
    
    // For listings found, do basic validation
    const confidence = this.calculateConfidence(html, postcodeData, listingCount);
    
    return {
      status: "investigate",
      count: listingCount,
      confidence: confidence >= 70 ? "High" : confidence >= 40 ? "Medium" : "Low",
      message: `Found ${listingCount} properties with ${confidence}% confidence`,
      url,
      listing_url: HyperlinkGenerator.generateListingUrl(platform, postcodeData),
      search_method: "scrapingbee-http",
      precision: confidence >= 70 ? "high" : confidence >= 40 ? "medium" : "low",
      validation_score: confidence
    };
  }
  
  private calculateConfidence(html: string, postcodeData: PostcodeResult, listingCount: number): number {
    let confidence = 50; // Base confidence
    
    // Check for postcode presence
    const postcodeRegex = new RegExp(postcodeData.postcode.replace(/\s+/g, '\\s*'), 'gi');
    if (postcodeRegex.test(html)) {
      confidence += 30;
    }
    
    // Check for street name if available
    if (postcodeData.streetName) {
      const streetRegex = new RegExp(postcodeData.streetName.replace(/\s+/g, '\\s*'), 'gi');
      if (streetRegex.test(html)) {
        confidence += 20;
      }
    }
    
    // Adjust based on listing count
    if (listingCount > 0 && listingCount < 100) {
      confidence += 10; // Reasonable number of listings
    } else if (listingCount >= 100) {
      confidence -= 20; // Too many listings might indicate broad search
    }
    
    return Math.min(100, Math.max(0, confidence));
  }
  
  private isBlocked(html: string, platform: string): boolean {
    const blockingPatterns = [
      'Please verify you are a human',
      'Access to this page has been denied',
      'captcha',
      'challenge-platform',
      'Too many requests',
      'Rate limit exceeded',
      'blocked',
      'forbidden'
    ];
    
    const htmlLower = html.toLowerCase();
    return blockingPatterns.some(pattern => htmlLower.includes(pattern.toLowerCase()));
  }
}
