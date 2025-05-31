
import { PostcodeResult } from './types.ts';

export class HyperlinkGenerator {
  static generateListingUrl(platform: string, postcodeData: PostcodeResult): string {
    const { postcode, streetName, address, latitude, longitude } = postcodeData;
    
    // Prioritize full address, then coordinates, then postcode
    let searchQuery = postcode;
    if (address) {
      searchQuery = address;
    } else if (streetName) {
      searchQuery = `${streetName}, ${postcode}`;
    }
    
    switch (platform) {
      case 'airbnb':
        if (latitude && longitude) {
          return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&lat=${latitude}&lng=${longitude}&zoom=15`;
        }
        return `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
        
      case 'spareroom':
        if (latitude && longitude) {
          return `https://www.spareroom.co.uk/flatshare/?lat=${latitude}&lng=${longitude}&radius=0.5`;
        }
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(searchQuery)}`;
        
      case 'gumtree':
        if (latitude && longitude) {
          return `https://www.gumtree.com/property-to-rent/${encodeURIComponent(postcode.toLowerCase().replace(/\s+/g, '-'))}?latitude=${latitude}&longitude=${longitude}`;
        }
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(searchQuery)}&search_category=property-to-rent`;
        
      default:
        return '';
    }
  }
  
  static generateMapViewUrl(platform: string, postcodeData: PostcodeResult): string {
    const { postcode, latitude, longitude } = postcodeData;
    
    if (!latitude || !longitude) {
      // Fallback to postcode-based search
      return this.generateListingUrl(platform, postcodeData);
    }
    
    switch (platform) {
      case 'airbnb':
        return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&lat=${latitude}&lng=${longitude}&zoom=16`;
        
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?lat=${latitude}&lng=${longitude}&radius=1`;
        
      case 'gumtree':
        return `https://www.gumtree.com/property-to-rent/${encodeURIComponent(postcode.toLowerCase().replace(/\s+/g, '-'))}?latitude=${latitude}&longitude=${longitude}`;
        
      default:
        return `https://www.google.com/maps?q=${latitude},${longitude}&zoom=15`;
    }
  }
  
  static generateGoogleMapsUrl(postcodeData: PostcodeResult): string {
    const { latitude, longitude, postcode } = postcodeData;
    
    if (latitude && longitude) {
      return `https://www.google.com/maps?q=${latitude},${longitude}&zoom=16`;
    }
    
    return `https://www.google.com/maps/search/${encodeURIComponent(postcode)}`;
  }
}
