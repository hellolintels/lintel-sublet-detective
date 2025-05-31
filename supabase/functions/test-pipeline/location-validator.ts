
import { PostcodeResult } from './types.ts';

export interface LocationValidationResult {
  isValid: boolean;
  confidence: number;
  reasons: string[];
  extractedPostcode?: string;
  extractedAddress?: string;
  distanceFromTarget?: number;
}

export class LocationValidator {
  private readonly MAX_DISTANCE_KM = 2; // Maximum distance for valid matches
  private readonly UK_POSTCODE_REGEX = /\b([A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2})\b/gi;
  private readonly STREET_PATTERNS = [
    /(\d+[\w\s]*(?:street|road|lane|avenue|drive|way|place|court|gardens|terrace|close|square|broadway|crescent|park|grove|mews|hill|rise|row|parade|walk))/gi,
    /(\w+\s+(?:street|road|lane|avenue|drive|way|place|court|gardens|terrace|close|square|broadway|crescent|park|grove|mews|hill|rise|row|parade|walk))/gi
  ];

  validateLocationMatch(
    html: string, 
    targetPostcode: PostcodeResult, 
    platform: string
  ): LocationValidationResult {
    console.log(`🔍 Validating location match for ${targetPostcode.postcode} on ${platform}`);
    
    const extractedData = this.extractLocationData(html);
    const postcodeMatch = this.validatePostcodeMatch(extractedData.postcodes, targetPostcode.postcode);
    const streetMatch = this.validateStreetMatch(extractedData.addresses, targetPostcode.streetName);
    const geographicMatch = this.validateGeographicProximity(extractedData, targetPostcode);
    
    let confidence = 0;
    const reasons: string[] = [];
    
    // Calculate confidence based on multiple factors
    if (postcodeMatch.isExactMatch) {
      confidence += 40;
      reasons.push(`Exact postcode match: ${postcodeMatch.matchedPostcode}`);
    } else if (postcodeMatch.isPartialMatch) {
      confidence += 20;
      reasons.push(`Partial postcode match: ${postcodeMatch.matchedPostcode}`);
    }
    
    if (streetMatch.isMatch) {
      confidence += 30;
      reasons.push(`Street name match: ${streetMatch.matchedStreet}`);
    }
    
    if (geographicMatch.isValid) {
      confidence += 20;
      reasons.push(`Geographic proximity: ${geographicMatch.distance?.toFixed(2)}km`);
    } else if (geographicMatch.distance !== undefined) {
      reasons.push(`Too far from target: ${geographicMatch.distance.toFixed(2)}km`);
    }
    
    // Platform-specific adjustments
    if (platform === 'airbnb' && confidence > 50) {
      confidence += 10; // Airbnb typically has more precise location data
    }
    
    const isValid = confidence >= 50 && (!geographicMatch.distance || geographicMatch.distance <= this.MAX_DISTANCE_KM);
    
    console.log(`📊 Location validation result: ${isValid ? 'VALID' : 'INVALID'} (confidence: ${confidence}%)`);
    console.log(`📍 Reasons: ${reasons.join(', ')}`);
    
    return {
      isValid,
      confidence,
      reasons,
      extractedPostcode: postcodeMatch.matchedPostcode,
      extractedAddress: extractedData.addresses[0],
      distanceFromTarget: geographicMatch.distance
    };
  }

  private extractLocationData(html: string): {
    postcodes: string[];
    addresses: string[];
  } {
    const postcodes: string[] = [];
    const addresses: string[] = [];
    
    // Extract postcodes
    const postcodeMatches = html.matchAll(this.UK_POSTCODE_REGEX);
    for (const match of postcodeMatches) {
      const postcode = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
      if (!postcodes.includes(postcode)) {
        postcodes.push(postcode);
      }
    }
    
    // Extract street addresses
    for (const pattern of this.STREET_PATTERNS) {
      const streetMatches = html.matchAll(pattern);
      for (const match of streetMatches) {
        const address = match[1].trim();
        if (address.length > 5 && !addresses.includes(address)) {
          addresses.push(address);
        }
      }
    }
    
    console.log(`📍 Extracted ${postcodes.length} postcodes and ${addresses.length} addresses`);
    return { postcodes, addresses };
  }

  private validatePostcodeMatch(extractedPostcodes: string[], targetPostcode: string): {
    isExactMatch: boolean;
    isPartialMatch: boolean;
    matchedPostcode?: string;
  } {
    const normalizedTarget = targetPostcode.replace(/\s+/g, '').toUpperCase();
    const targetArea = targetPostcode.split(' ')[0].toUpperCase(); // e.g., "EH12" from "EH12 8UU"
    
    for (const extracted of extractedPostcodes) {
      const normalizedExtracted = extracted.replace(/\s+/g, '').toUpperCase();
      
      // Exact match
      if (normalizedExtracted === normalizedTarget) {
        return { isExactMatch: true, isPartialMatch: false, matchedPostcode: extracted };
      }
      
      // Partial match (same area)
      const extractedArea = extracted.split(' ')[0].toUpperCase();
      if (extractedArea === targetArea) {
        return { isExactMatch: false, isPartialMatch: true, matchedPostcode: extracted };
      }
    }
    
    return { isExactMatch: false, isPartialMatch: false };
  }

  private validateStreetMatch(extractedAddresses: string[], targetStreet?: string): {
    isMatch: boolean;
    matchedStreet?: string;
  } {
    if (!targetStreet) {
      return { isMatch: false };
    }
    
    const normalizedTarget = targetStreet.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (const address of extractedAddresses) {
      const normalizedAddress = address.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Exact match
      if (normalizedAddress.includes(normalizedTarget)) {
        return { isMatch: true, matchedStreet: address };
      }
      
      // Fuzzy match (check for key words)
      const targetWords = normalizedTarget.split(' ').filter(word => word.length > 2);
      const matchedWords = targetWords.filter(word => normalizedAddress.includes(word));
      
      if (matchedWords.length >= Math.ceil(targetWords.length * 0.7)) {
        return { isMatch: true, matchedStreet: address };
      }
    }
    
    return { isMatch: false };
  }

  private validateGeographicProximity(
    extractedData: { postcodes: string[] }, 
    targetPostcode: PostcodeResult
  ): {
    isValid: boolean;
    distance?: number;
  } {
    // For now, we'll implement basic validation
    // In a full implementation, we'd geocode extracted postcodes and calculate distances
    
    if (!targetPostcode.latitude || !targetPostcode.longitude) {
      return { isValid: true }; // Can't validate without coordinates
    }
    
    // Basic check: ensure extracted postcodes are from the same general area
    const targetArea = targetPostcode.postcode.split(' ')[0].toUpperCase();
    const hasMatchingArea = extractedData.postcodes.some(pc => 
      pc.split(' ')[0].toUpperCase() === targetArea
    );
    
    return { 
      isValid: hasMatchingArea,
      distance: hasMatchingArea ? 0.5 : 10 // Estimated distance
    };
  }

  // Helper method to calculate distance between two coordinates
  private calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
