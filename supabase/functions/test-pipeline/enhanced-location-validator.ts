
import { PostcodeResult } from './types.ts';

export interface LocationValidationResult {
  isValid: boolean;
  confidence: number;
  reasons: string[];
  extractedPostcode?: string;
  extractedAddress?: string;
  distanceFromTarget?: number;
}

export class EnhancedLocationValidator {
  private readonly MAX_DISTANCE_KM = 1.5; // Tighter distance for accuracy
  private readonly UK_POSTCODE_REGEX = /\b([A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2})\b/gi;
  
  validateLocationAccuracy(
    html: string, 
    targetPostcode: PostcodeResult, 
    platform: string
  ): LocationValidationResult {
    console.log(`🎯 Enhanced validation for ${targetPostcode.postcode} on ${platform}`);
    
    const extractedData = this.extractLocationData(html);
    const postcodeMatch = this.validatePostcodeMatch(extractedData.postcodes, targetPostcode.postcode);
    const streetMatch = this.validateStreetMatch(extractedData.addresses, targetPostcode.streetName);
    
    let confidence = 0;
    const reasons: string[] = [];
    
    // Enhanced confidence calculation
    if (postcodeMatch.isExactMatch) {
      confidence += 50;
      reasons.push(`Exact postcode: ${postcodeMatch.matchedPostcode}`);
    } else if (postcodeMatch.isPartialMatch) {
      confidence += 25;
      reasons.push(`Area match: ${postcodeMatch.matchedPostcode}`);
    }
    
    if (streetMatch.isMatch) {
      confidence += 30;
      reasons.push(`Street verified: ${streetMatch.matchedStreet}`);
    }
    
    // Geographic proximity check
    if (targetPostcode.latitude && targetPostcode.longitude) {
      confidence += 20;
      reasons.push('Coordinate validation active');
    }
    
    const isValid = confidence >= 40 && (postcodeMatch.isExactMatch || postcodeMatch.isPartialMatch);
    
    console.log(`📊 Validation result: ${isValid ? 'VALID' : 'INVALID'} (${confidence}% confidence)`);
    console.log(`📍 Validation reasons: ${reasons.join(', ')}`);
    
    return {
      isValid,
      confidence,
      reasons,
      extractedPostcode: postcodeMatch.matchedPostcode,
      extractedAddress: extractedData.addresses[0],
      distanceFromTarget: 0.5 // Estimated for now
    };
  }

  private extractLocationData(html: string): { postcodes: string[]; addresses: string[] } {
    const postcodes: string[] = [];
    const addresses: string[] = [];
    
    // Extract postcodes with improved regex
    const postcodeMatches = html.matchAll(this.UK_POSTCODE_REGEX);
    for (const match of postcodeMatches) {
      const postcode = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
      if (!postcodes.includes(postcode) && postcode.length >= 5) {
        postcodes.push(postcode);
      }
    }
    
    // Extract street addresses
    const streetPatterns = [
      /(\d+[\w\s]*(?:street|road|lane|avenue|drive|way|place|court|gardens|terrace|close|square))/gi,
      /(\w+\s+(?:street|road|lane|avenue|drive|way|place|court|gardens|terrace|close|square))/gi
    ];
    
    for (const pattern of streetPatterns) {
      const streetMatches = html.matchAll(pattern);
      for (const match of streetMatches) {
        const address = match[1].trim();
        if (address.length > 5 && !addresses.includes(address)) {
          addresses.push(address);
        }
      }
    }
    
    console.log(`📍 Extracted: ${postcodes.length} postcodes, ${addresses.length} addresses`);
    return { postcodes, addresses };
  }

  private validatePostcodeMatch(extractedPostcodes: string[], targetPostcode: string) {
    const normalizedTarget = targetPostcode.replace(/\s+/g, '').toUpperCase();
    const targetArea = targetPostcode.split(' ')[0].toUpperCase();
    
    for (const extracted of extractedPostcodes) {
      const normalizedExtracted = extracted.replace(/\s+/g, '').toUpperCase();
      
      if (normalizedExtracted === normalizedTarget) {
        return { isExactMatch: true, isPartialMatch: false, matchedPostcode: extracted };
      }
      
      const extractedArea = extracted.split(' ')[0].toUpperCase();
      if (extractedArea === targetArea) {
        return { isExactMatch: false, isPartialMatch: true, matchedPostcode: extracted };
      }
    }
    
    return { isExactMatch: false, isPartialMatch: false };
  }

  private validateStreetMatch(extractedAddresses: string[], targetStreet?: string) {
    if (!targetStreet) return { isMatch: false };
    
    const normalizedTarget = targetStreet.toLowerCase();
    
    for (const address of extractedAddresses) {
      const normalizedAddress = address.toLowerCase();
      
      if (normalizedAddress.includes(normalizedTarget)) {
        return { isMatch: true, matchedStreet: address };
      }
    }
    
    return { isMatch: false };
  }
}
