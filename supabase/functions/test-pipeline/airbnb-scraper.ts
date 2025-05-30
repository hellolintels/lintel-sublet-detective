
import { PostcodeResult, ScrapingResult } from './types.ts';
import { executeEnhancedWebSocketScraping } from './enhanced-websocket-handler.ts';

export interface AirbnbSearchStrategy {
  name: string;
  url: string;
  precision: 'ultra-high' | 'high' | 'medium' | 'low';
  expectedAccuracy: number;
}

export async function testScrapeAirbnb(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address, latitude, longitude } = postcodeData;
  console.log(`🏠 Testing Airbnb with enhanced WebSocket connection for: ${postcode}`);
  
  // Generate all search strategies
  const strategies = generateSearchStrategies(postcodeData);
  
  console.log(`🎯 Generated ${strategies.length} search strategies for ${postcode}`);
  strategies.forEach((strategy, index) => {
    console.log(`   ${index + 1}. ${strategy.name} (${strategy.precision}) - Expected accuracy: ${strategy.expectedAccuracy}%`);
  });
  
  // Try each strategy until we get a successful result
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    console.log(`\n🔍 Attempting strategy ${i + 1}/${strategies.length}: ${strategy.name}`);
    console.log(`📍 URL: ${strategy.url}`);
    
    try {
      const result = await executeEnhancedWebSocketScraping(strategy.url, postcodeData, 'airbnb');
      
      if (result.status !== "error") {
        console.log(`✅ Strategy ${i + 1} succeeded: ${strategy.name}`);
        return {
          ...result,
          search_method: strategy.name,
          precision: strategy.precision,
          url: strategy.url
        };
      }
      
      console.log(`⚠️ Strategy ${i + 1} failed: ${result.message}`);
      
      // If this was a "too_broad" result, don't try less precise methods
      if (result.status === "too_broad") {
        console.log(`🛑 Search area too broad, skipping remaining strategies`);
        return {
          ...result,
          search_method: strategy.name,
          precision: strategy.precision,
          url: strategy.url
        };
      }
      
    } catch (error) {
      console.log(`⚠️ Strategy ${i + 1} threw error: ${error.message}`);
    }
  }
  
  // All strategies failed
  console.error(`❌ All ${strategies.length} Airbnb search strategies failed for ${postcode}`);
  return {
    status: "error",
    count: 0,
    search_method: "all-strategies-failed",
    boundary_method: "exhausted-options",
    precision: "failed",
    message: `All ${strategies.length} search strategies failed for postcode ${postcode}`
  };
}

function generateSearchStrategies(postcodeData: PostcodeResult): AirbnbSearchStrategy[] {
  const { postcode, streetName, address, latitude, longitude } = postcodeData;
  const strategies: AirbnbSearchStrategy[] = [];
  
  // Strategy 1: Ultra-precise coordinates (if available)
  if (latitude && longitude) {
    // Very tight radius - 20m with high zoom
    const ultraPreciseUrl = buildCoordinateSearchUrl(latitude, longitude, 0.0002, 20);
    strategies.push({
      name: "ultra-precise-coordinates",
      url: ultraPreciseUrl,
      precision: "ultra-high",
      expectedAccuracy: 95
    });
    
    // Slightly wider radius - 50m with good zoom
    const preciseUrl = buildCoordinateSearchUrl(latitude, longitude, 0.0005, 18);
    strategies.push({
      name: "precise-coordinates",
      url: preciseUrl,
      precision: "high",
      expectedAccuracy: 85
    });
  }
  
  // Strategy 2: Native location search with full address
  if (address) {
    const fullAddressUrl = buildLocationSearchUrl(address);
    strategies.push({
      name: "full-address-search",
      url: fullAddressUrl,
      precision: "high",
      expectedAccuracy: 80
    });
  }
  
  // Strategy 3: Street + postcode combination
  if (streetName) {
    const streetPostcodeQuery = `${streetName}, ${postcode}`;
    const streetUrl = buildLocationSearchUrl(streetPostcodeQuery);
    strategies.push({
      name: "street-postcode-search",
      url: streetUrl,
      precision: "high",
      expectedAccuracy: 75
    });
  }
  
  // Strategy 4: Postcode-only search
  const postcodeUrl = buildLocationSearchUrl(postcode);
  strategies.push({
    name: "postcode-only-search",
    url: postcodeUrl,
    precision: "medium",
    expectedAccuracy: 60
  });
  
  // Strategy 5: Place ID search (fallback)
  const placeIdUrl = buildPlaceIdSearchUrl(postcode);
  strategies.push({
    name: "place-id-search",
    url: placeIdUrl,
    precision: "low",
    expectedAccuracy: 40
  });
  
  return strategies;
}

function buildCoordinateSearchUrl(latitude: number, longitude: number, radiusDelta: number, zoom: number): string {
  const swLat = latitude - radiusDelta;
  const swLng = longitude - radiusDelta;
  const neLat = latitude + radiusDelta;
  const neLng = longitude + radiusDelta;
  
  return `https://www.airbnb.com/s/homes?refinement_paths%5B%5D=%2Fhomes&search_mode=flex_destinations_search&sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}&zoom=${zoom}&search_by_map=true`;
}

function buildLocationSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query.trim());
  return `https://www.airbnb.com/s/${encodedQuery}/homes`;
}

function buildPlaceIdSearchUrl(postcode: string): string {
  const encodedPostcode = encodeURIComponent(postcode.trim());
  return `https://www.airbnb.com/s/places/${encodedPostcode}/homes`;
}

export function validateAirbnbResult(result: any, postcode: string): {
  isValid: boolean;
  confidence: number;
  issues: string[];
} {
  const issues: string[] = [];
  let confidence = 100;
  
  // Check if we have listing data
  if (!result || !result.listings) {
    issues.push("No listing data received");
    return { isValid: false, confidence: 0, issues };
  }
  
  // Check for "too broad" indicators
  if (result.totalCount && result.totalCount.text) {
    const countText = result.totalCount.text.toLowerCase();
    if (countText.includes("over 1,000") || countText.includes("1,000+")) {
      issues.push("Search area too broad (over 1,000 results)");
      confidence -= 50;
    }
  }
  
  // Validate postcode presence in results
  const listings = Array.isArray(result.listings) ? result.listings : [];
  const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
  
  const matchingListings = listings.filter((listing: any) => {
    const text = listing.text || '';
    return postcodeRegex.test(text);
  });
  
  const matchRate = listings.length > 0 ? (matchingListings.length / listings.length) * 100 : 0;
  
  if (matchRate < 10) {
    issues.push(`Low postcode match rate: ${matchRate.toFixed(1)}%`);
    confidence -= 30;
  } else if (matchRate < 30) {
    issues.push(`Moderate postcode match rate: ${matchRate.toFixed(1)}%`);
    confidence -= 15;
  }
  
  // Check listing quality
  if (listings.length === 0) {
    issues.push("No listings found");
    confidence = 0;
  } else if (listings.length < 3) {
    issues.push("Very few listings found");
    confidence -= 20;
  }
  
  const isValid = confidence > 20 && issues.length < 3;
  
  return {
    isValid,
    confidence: Math.max(0, confidence),
    issues
  };
}
