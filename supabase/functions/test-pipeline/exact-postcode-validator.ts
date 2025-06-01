
/**
 * Manus.ai's exact postcode validation implementation
 * Zero false positives - only exact postcode matches return INVESTIGATE
 */
export class ExactPostcodeValidator {
  
  /**
   * Normalize postcode for exact comparison
   * Removes all non-alphanumeric, converts to uppercase, inserts space before last 3 chars
   */
  normalizePostcode(postcode: string | null): string | null {
    if (!postcode) return null;
    
    // Remove all non-alphanumeric characters and convert to uppercase
    let normalized = postcode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Insert space before the last 3 characters
    if (normalized.length > 3) {
      normalized = normalized.slice(0, -3) + ' ' + normalized.slice(-3);
    }
    
    // Validate against the standard pattern
    const postcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]? [0-9][A-Z]{2}$/;
    if (postcodeRegex.test(normalized)) {
      console.log(`✅ Postcode normalized: "${postcode}" → "${normalized}"`);
      return normalized;
    }
    
    console.log(`❌ Invalid postcode format after normalization: "${postcode}" → "${normalized}"`);
    return null;
  }
  
  /**
   * Extract first valid postcode from text
   */
  extractFirstPostcode(text: string): string | null {
    if (!text) return null;
    
    // UK postcode regex pattern
    const postcodePattern = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/gi;
    
    const matches = text.match(postcodePattern);
    const result = matches && matches.length > 0 ? matches[0] : null;
    
    if (result) {
      console.log(`📍 Extracted postcode from text: "${result}" from "${text.substring(0, 100)}..."`);
    }
    
    return result;
  }
  
  /**
   * Platform-specific DOM-based postcode extraction
   */
  extractPostcodeFromListing(html: string, platform: string): string | null {
    console.log(`🔍 Extracting postcode from ${platform} HTML (${html.length} chars)`);
    
    try {
      // For server-side, we'll use regex-based extraction since DOMParser isn't available
      let locationText = '';
      
      if (platform === 'airbnb') {
        // Look for Airbnb-specific location patterns
        const titleMatch = html.match(/data-testid="listing-card-title"[^>]*>([^<]+)</i);
        const subtitleMatch = html.match(/data-testid="listing-card-subtitle"[^>]*>([^<]+)</i);
        
        if (titleMatch && subtitleMatch) {
          locationText = titleMatch[1] + ' ' + subtitleMatch[1];
          console.log(`🏠 Airbnb location extracted: "${locationText}"`);
        } else {
          // Fallback to general location patterns
          const locationMatch = html.match(/(?:in |near |, )([A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})/gi);
          if (locationMatch) {
            locationText = locationMatch[0];
            console.log(`🏠 Airbnb fallback location: "${locationText}"`);
          }
        }
      } 
      else if (platform === 'spareroom') {
        // Look for SpareRoom location patterns
        const locationMatch = html.match(/class="listing-location"[^>]*>([^<]+)</i) ||
                            html.match(/location[^>]*>([^<]*[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}[^<]*)</i);
        
        if (locationMatch) {
          locationText = locationMatch[1];
          console.log(`🏠 SpareRoom location extracted: "${locationText}"`);
        }
      } 
      else if (platform === 'gumtree') {
        // Look for Gumtree location patterns
        const locationMatch = html.match(/data-q="tile-location"[^>]*>([^<]+)</i) ||
                            html.match(/location[^>]*>([^<]*[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}[^<]*)</i);
        
        if (locationMatch) {
          locationText = locationMatch[1];
          console.log(`🏠 Gumtree location extracted: "${locationText}"`);
        }
      }
      
      if (!locationText) {
        console.log(`⚠️ No platform-specific location found for ${platform}, trying generic extraction`);
        // Generic postcode extraction as fallback
        const genericMatch = html.match(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/gi);
        if (genericMatch && genericMatch.length > 0) {
          locationText = genericMatch[0];
          console.log(`📍 Generic postcode found: "${locationText}"`);
        }
      }
      
      return this.extractFirstPostcode(locationText);
      
    } catch (error) {
      console.error(`❌ Error extracting postcode from ${platform}:`, error);
      return null;
    }
  }
  
  /**
   * Exact match validation - binary result
   */
  isExactMatch(listingHtml: string, searchPostcode: string, platform: string): boolean {
    console.log(`🎯 Validating exact match for ${platform} against postcode: ${searchPostcode}`);
    
    // Extract postcode from listing
    const listingPostcode = this.extractPostcodeFromListing(listingHtml, platform);
    console.log(`📍 Extracted listing postcode: ${listingPostcode || 'NONE'}`);
    
    // Normalize both postcodes
    const normListingPostcode = this.normalizePostcode(listingPostcode);
    const normSearchPostcode = this.normalizePostcode(searchPostcode);
    
    console.log(`🔄 Normalized comparison: "${normListingPostcode}" vs "${normSearchPostcode}"`);
    
    // Only return true for exact matches
    if (normListingPostcode && normSearchPostcode) {
      const isMatch = normListingPostcode === normSearchPostcode;
      console.log(`${isMatch ? '✅' : '❌'} Exact match result: ${isMatch}`);
      return isMatch;
    }
    
    console.log(`❌ Exact match failed: missing normalized postcodes`);
    return false;
  }
}
