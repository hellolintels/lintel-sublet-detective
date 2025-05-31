
import { PostcodeResult } from './types.ts';

export class URLGenerators {
  static buildSearchQuery(postcodeData: PostcodeResult, platform: string): string {
    const { postcode, streetName, address } = postcodeData;
    
    if (address && address.length > postcode.length + 10) {
      return address;
    }
    
    if (streetName) {
      return `${streetName}, ${postcode}`;
    }
    
    return postcode;
  }

  static buildPlatformUrl(platform: string, searchQuery: string): string {
    const encodedQuery = encodeURIComponent(searchQuery);
    
    switch (platform) {
      case 'airbnb':
        return `https://www.airbnb.com/s/${encodedQuery}/homes?refinement_paths%5B%5D=%2Fhomes`;
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?search=${encodedQuery}&mode=list`;
      case 'gumtree':
        return `https://www.gumtree.com/search?search_location=${encodedQuery}&search_category=property-to-rent`;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  static buildScrapingBeeUrl(targetUrl: string, params: Record<string, string>, apiKey: string): string {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      url: targetUrl,
      ...params
    });
    
    return `https://app.scrapingbee.com/api/v1/?${searchParams.toString()}`;
  }

  static generateMapViewUrl(platform: string, postcodeData: PostcodeResult): string {
    const { postcode, latitude, longitude } = postcodeData;
    
    switch (platform) {
      case 'airbnb':
        if (latitude && longitude) {
          const radiusDelta = 0.002;
          const swLat = latitude - radiusDelta;
          const swLng = longitude - radiusDelta;
          const neLat = latitude + radiusDelta;
          const neLng = longitude + radiusDelta;
          return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}&zoom=16&search_by_map=true`;
        }
        return `https://www.airbnb.com/s/${encodeURIComponent(postcode)}/homes?refinement_paths%5B%5D=%2Fhomes`;
      
      case 'spareroom':
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(postcode)}&mode=map`;
      
      case 'gumtree':
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(postcode)}&search_category=property-to-rent&photos_filter=false&map_view=true`;
      
      default:
        return '';
    }
  }

  static extractFirstListingUrl(html: string, platform: string, postcodeData: PostcodeResult): string {
    const { postcode } = postcodeData;
    
    switch (platform) {
      case 'airbnb':
        const airbnbMatch = html.match(/href="\/rooms\/(\d+)[^"]*"/);
        if (airbnbMatch) {
          return `https://www.airbnb.com/rooms/${airbnbMatch[1]}`;
        }
        return `https://www.airbnb.com/s/${encodeURIComponent(postcode)}/homes`;
      
      case 'spareroom':
        const spareroomMatch = html.match(/href="[^"]*flatshare_detail\.pl\?flatshare_id=(\d+)[^"]*"/);
        if (spareroomMatch) {
          return `https://www.spareroom.co.uk/flatshare/flatshare_detail.pl?flatshare_id=${spareroomMatch[1]}`;
        }
        return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(postcode)}`;
      
      case 'gumtree':
        const gumtreeMatch = html.match(/href="[^"]*\/ad\/(\d+)[^"]*"/);
        if (gumtreeMatch) {
          return `https://www.gumtree.com/p/${gumtreeMatch[1]}`;
        }
        return `https://www.gumtree.com/search?search_location=${encodeURIComponent(postcode)}&search_category=property-to-rent`;
      
      default:
        return '';
    }
  }
}
