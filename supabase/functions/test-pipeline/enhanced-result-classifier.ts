
import { PostcodeResult, ScrapingResult } from './types.ts';
import { StrictPostcodeValidator } from './strict-postcode-validator.ts';
import { StrictErrorClassifier } from './strict-error-classifier.ts';
import { StrictListingCounter } from './strict-listing-counter.ts';
import { HyperlinkGenerator } from './hyperlink-generator.ts';

export class EnhancedResultClassifier {
  private postcodeValidator = new StrictPostcodeValidator();
  private errorClassifier = new StrictErrorClassifier();
  private listingCounter = new StrictListingCounter();
  
  classifyScrapingResult(
    html: string,
    postcodeData: PostcodeResult,
    platform: string,
    listingCount: number,
    url: string
  ): ScrapingResult {
    console.log(`🎯 STRICT classification for ${platform} - ${postcodeData.postcode}`);
    
    // Step 1: Check for errors first (blocking, loading issues)
    const errorClassification = this.errorClassifier.classifyResponse(html, platform, url);
    
    if (errorClassification.type === 'blocked') {
      return {
        status: "error",
        count: 0,
        message: `${platform} is blocking requests`,
        url,
        search_method: "blocked",
        precision: "failed"
      };
    }
    
    if (errorClassification.type === 'loading_issues') {
      return {
        status: "error",
        count: 0,
        message: `${platform} loading issues detected`,
        url,
        search_method: "loading-error",
        precision: "failed"
      };
    }
    
    // Step 2: Get accurate listing count using strict selectors
    const accurateListingCount = this.listingCounter.countListings(html, platform);
    
    // Step 3: If explicit "no results" detected, return confident no_match
    if (errorClassification.type === 'no_results') {
      return {
        status: "no_match",
        count: 0,
        message: "Platform confirmed no properties in search area",
        url,
        map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
        search_method: "strict-validation",
        precision: "high",
        confidence: "High"
      };
    }
    
    // Step 4: If no listings found, return no_match
    if (accurateListingCount === 0) {
      return {
        status: "no_match",
        count: 0,
        message: "No properties found in search area",
        url,
        map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
        search_method: "strict-validation",
        precision: "high",
        confidence: "High"
      };
    }
    
    // Step 5: Strict postcode validation for listings found
    const extractedPostcodes = this.postcodeValidator.extractPostcodes(html);
    const bestMatch = this.postcodeValidator.findBestPostcodeMatch(extractedPostcodes, postcodeData.postcode);
    
    console.log(`🔍 Strict validation: ${extractedPostcodes.length} postcodes extracted, best confidence: ${bestMatch.confidence}`);
    
    // Step 6: Apply strict 95% threshold for INVESTIGATE
    if (bestMatch.confidence >= 0.95) {
      return {
        status: "investigate",
        count: accurateListingCount,
        confidence: "High",
        message: `EXACT MATCH: Found ${accurateListingCount} properties in ${postcodeData.postcode}`,
        url,
        listing_url: HyperlinkGenerator.generateListingUrl(platform, postcodeData),
        search_method: "strict-exact-match",
        precision: "high",
        validation_score: Math.round(bestMatch.confidence * 100),
        extracted_postcode: bestMatch.postcode
      };
    }
    
    // Step 7: Everything else is classified as no_match (strict approach)
    return {
      status: "no_match",
      count: 0,
      confidence: "High",
      message: `Found ${accurateListingCount} listings but NO EXACT postcode match (${Math.round(bestMatch.confidence * 100)}% confidence) - likely different area`,
      url,
      map_view_url: HyperlinkGenerator.generateMapViewUrl(platform, postcodeData),
      search_method: "strict-validation",
      precision: "high",
      validation_score: Math.round(bestMatch.confidence * 100)
    };
  }
}
