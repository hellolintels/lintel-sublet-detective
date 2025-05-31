
export class StrictPostcodeValidator {
  private readonly UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i;
  
  /**
   * Normalize postcode for exact comparison
   * Removes all spaces, converts to uppercase
   */
  normalizePostcode(postcode: string): string {
    return postcode.replace(/\s+/g, '').toUpperCase().trim();
  }
  
  /**
   * Validate UK postcode format
   */
  isValidUKPostcode(postcode: string): boolean {
    return this.UK_POSTCODE_REGEX.test(postcode.trim());
  }
  
  /**
   * Strict exact postcode matching - binary result
   * Returns 1.0 for exact match, 0.1 for anything else
   */
  getStrictLocationConfidence(extractedPostcode: string, targetPostcode: string): number {
    if (!extractedPostcode || !targetPostcode) {
      return 0.1;
    }
    
    const normalizedExtracted = this.normalizePostcode(extractedPostcode);
    const normalizedTarget = this.normalizePostcode(targetPostcode);
    
    // Only exact matches get high confidence
    if (normalizedExtracted === normalizedTarget) {
      console.log(`✅ EXACT MATCH: ${extractedPostcode} === ${targetPostcode}`);
      return 1.0;
    }
    
    console.log(`❌ NO MATCH: ${extractedPostcode} !== ${targetPostcode}`);
    return 0.1;
  }
  
  /**
   * Extract all potential postcodes from HTML
   */
  extractPostcodes(html: string): string[] {
    const postcodes: string[] = [];
    const matches = html.matchAll(/\b([A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2})\b/gi);
    
    for (const match of matches) {
      const postcode = match[1].trim();
      if (this.isValidUKPostcode(postcode) && !postcodes.includes(postcode)) {
        postcodes.push(postcode);
      }
    }
    
    return postcodes;
  }
  
  /**
   * Find best matching postcode from extracted list
   */
  findBestPostcodeMatch(extractedPostcodes: string[], targetPostcode: string): {
    postcode: string | null;
    confidence: number;
  } {
    let bestMatch = null;
    let bestConfidence = 0.1;
    
    for (const extracted of extractedPostcodes) {
      const confidence = this.getStrictLocationConfidence(extracted, targetPostcode);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = extracted;
      }
    }
    
    return {
      postcode: bestMatch,
      confidence: bestConfidence
    };
  }
}
