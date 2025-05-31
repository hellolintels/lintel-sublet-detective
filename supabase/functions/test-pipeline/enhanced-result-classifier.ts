
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
    
    // Validate location accuracy for listings found
    const locationValidation = this.locationValidator.validateLocationAccuracy(
      html, 
      postcodeData, 
      platform
    );
    
    return this.generateClassificationResult(
      listingCount,
      locationValidation,
      postcodeData,
      platform,
      url
    );
  }
  
  private generateClassificationResult(
    listingCount: number,
    validation: LocationValidationResult,
    postcodeData: PostcodeResult,
    platform: string,
    url: string
  ): ScrapingResult {
    const { isValid, confidence, reasons, extractedPostcode } = validation;
    
    // High confidence results
    if (isValid && confidence >= 70) {
      return {
        status: "investigate",
        count: listingCount,
        confidence: "High",
        message: `Found ${listingCount} properties with high location accuracy (${confidence}%)`,
        url,
        listing_url: HyperlinkGenerator.generateListingUrl(platform, postcodeData),
        search_method: "enhanced-location-validated",
        precision: "high",
        validation_score: confidence,
        extracted_postcode: extractedPostcode,
        accuracy_reasons: reasons
      };
    }
    
    // Medium confidence results
    if (isValid && confidence >= 40) {
      return {
        status: "investigate",
        count: listingCount,
        confidence: "Medium",
        message: `Found ${listingCount} properties with medium location accuracy (${confidence}%)`,
        url,
        listing_url: HyperlinkGenerator.generateListingUrl(platform, postcodeData),
        search_method: "enhanced-location-validated",
        precision: "medium",
        validation_score: confidence,
        extracted_postcode: extractedPostcode,
        accuracy_reasons: reasons
      };
    }
    
    // Low confidence - treat as no match
    return {
      status: "no_match",
      count: 0,
      confidence: "High",
      message: `${listingCount} listings found but failed location validation (${confidence}% confidence) - likely outside target area`,
      url,
      map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
      search_method: "enhanced-validation-failed",
      precision: "high",
      validation_score: confidence,
      extracted_postcode: extractedPostcode,
      accuracy_reasons: reasons
    };
  }
  
  private isBlocked(html: string, platform: string): boolean {
    const blockingPatterns = [
      'Please verify you are a human',
      'Access to this page has been denied',
      'captcha',
      'challenge-platform',
      'Too many requests',
      'Rate limit exceeded'
    ];
    
    const htmlLower = html.toLowerCase();
    return blockingPatterns.some(pattern => htmlLower.includes(pattern.toLowerCase())) ||
           html.length < 1000;
  }
}
