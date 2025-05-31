
import { PostcodeResult } from './types.ts';
import { StrictPostcodeValidator } from './strict-postcode-validator.ts';

export interface LocationValidationResult {
  isValid: boolean;
  confidence: number;
  reasons: string[];
  extractedPostcode?: string;
  extractedAddress?: string;
  distanceFromTarget?: number;
}

export class EnhancedLocationValidator {
  private strictValidator = new StrictPostcodeValidator();
  
  validateLocationAccuracy(
    html: string, 
    targetPostcode: PostcodeResult, 
    platform: string
  ): LocationValidationResult {
    console.log(`🎯 STRICT validation for ${targetPostcode.postcode} on ${platform}`);
    
    // Extract all postcodes from HTML
    const extractedPostcodes = this.strictValidator.extractPostcodes(html);
    console.log(`📍 Extracted postcodes: ${extractedPostcodes.join(', ')}`);
    
    // Find best match using strict binary confidence
    const bestMatch = this.strictValidator.findBestPostcodeMatch(extractedPostcodes, targetPostcode.postcode);
    
    const reasons: string[] = [];
    
    if (bestMatch.confidence >= 0.95) {
      reasons.push(`EXACT MATCH: ${bestMatch.postcode} === ${targetPostcode.postcode}`);
    } else if (bestMatch.postcode) {
      reasons.push(`NO MATCH: ${bestMatch.postcode} !== ${targetPostcode.postcode}`);
    } else {
      reasons.push(`NO POSTCODES: No valid postcodes found in ${platform} response`);
    }
    
    // Add coordinate validation if available
    if (targetPostcode.latitude && targetPostcode.longitude) {
      reasons.push('Coordinate-enhanced search active');
    }
    
    const isValid = bestMatch.confidence >= 0.95;
    
    console.log(`📊 STRICT validation result: ${isValid ? 'VALID' : 'INVALID'} (${Math.round(bestMatch.confidence * 100)}% confidence)`);
    console.log(`📍 Validation reasons: ${reasons.join(', ')}`);
    
    return {
      isValid,
      confidence: Math.round(bestMatch.confidence * 100),
      reasons,
      extractedPostcode: bestMatch.postcode,
      extractedAddress: undefined, // Not used in strict mode
      distanceFromTarget: isValid ? 0 : 999 // Binary: exact match or very far
    };
  }
}
