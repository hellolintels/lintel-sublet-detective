
/**
 * Bright Data WebSocket Browser API scraping module for Lintels address matching
 */

import { BrowserSDK } from '@brightdata/browser-sdk';
import { PostcodeResult } from "../utils/postcode-extractor.ts";

// Configuration for Bright Data WebSocket API
const BRIGHT_DATA_WEBSOCKET_ENDPOINT = Deno.env.get("BRIGHT_DATA_WEBSOCKET_ENDPOINT");
const BRIGHT_DATA_USERNAME = Deno.env.get("BRIGHT_DATA_USERNAME");
const BRIGHT_DATA_PASSWORD = Deno.env.get("BRIGHT_DATA_PASSWORD");

export async function scrapePostcodes(postcodes: PostcodeResult[]) {
  console.log(`Starting WebSocket scraping for ${postcodes.length} postcodes`);

  // Validate Bright Data WebSocket credentials
  if (!BRIGHT_DATA_WEBSOCKET_ENDPOINT || !BRIGHT_DATA_USERNAME || !BRIGHT_DATA_PASSWORD) {
    console.error("Bright Data WebSocket credentials not configured");
    throw new Error("Bright Data WebSocket credentials not configured");
  }

  const results = [];
  const batchSize = 3; // Smaller batches for WebSocket connections

  for (let i = 0; i < postcodes.length; i += batchSize) {
    const batch = postcodes.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}, postcodes: ${batch.map(p => p.postcode).join(', ')}`);

    const batchPromises = batch.map((postcodeData) => scrapePostcode(postcodeData));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < postcodes.length) {
      console.log("Waiting 3 seconds before processing next batch...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(`WebSocket scraping completed for all ${postcodes.length} postcodes`);
  return results;
}

async function scrapePostcode(postcodeData: PostcodeResult) {
  const { postcode, streetName, address } = postcodeData;
  console.log(`WebSocket scraping postcode: ${postcode}, Street: ${streetName || "Unknown"}`);

  try {
    // Make parallel requests to each platform using WebSocket API
    const [airbnbResult, spareroomResult, gumtreeResult] = await Promise.all([
      scrapeAirbnb(postcodeData),
      scrapeSpareRoom(postcodeData),
      scrapeGumtree(postcodeData)
    ]);

    return {
      postcode,
      address: address || "",
      streetName: streetName || "",
      airbnb: airbnbResult,
      spareroom: spareroomResult,
      gumtree: gumtreeResult
    };
  } catch (error) {
    console.error(`Error scraping postcode ${postcode}:`, error);
    return {
      postcode,
      address: address || "",
      streetName: streetName || "",
      airbnb: { status: "error", message: error.message },
      spareroom: { status: "error", message: error.message },
      gumtree: { status: "error", message: error.message }
    };
  }
}

async function scrapeAirbnb(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`WebSocket checking Airbnb for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
  
  try {
    const browserSDK = new BrowserSDK({
      endpoint: BRIGHT_DATA_WEBSOCKET_ENDPOINT,
      auth: {
        username: BRIGHT_DATA_USERNAME,
        password: BRIGHT_DATA_PASSWORD
      }
    });

    const result = await browserSDK.run(async (page) => {
      // Navigate to Airbnb search
      await page.goto(searchUrl, { waitUntil: 'networkidle' });
      
      // Add human-like delay
      await page.waitForTimeout(2000 + Math.random() * 2000);
      
      // Wait for listings to load
      await page.waitForSelector('[data-testid="card-container"]', { timeout: 30000 }).catch(() => null);
      
      // Extract listings and check for exact postcode matches
      const listings = await page.evaluate((data) => {
        const { postcode, streetName } = data;
        const listingCards = document.querySelectorAll('[data-testid="card-container"]');
        const matchedListings = [];
        
        // Create regex for exact postcode matching
        const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
        
        listingCards.forEach((card, index) => {
          const titleElement = card.querySelector('[data-testid="listing-card-title"]');
          const subtitleElement = card.querySelector('[data-testid="listing-card-subtitle"]');
          const linkElement = card.querySelector('a[href*="/rooms/"]');
          
          const title = titleElement?.textContent?.trim() || `Listing ${index + 1}`;
          const subtitle = subtitleElement?.textContent?.trim() || '';
          const href = linkElement?.href || '';
          
          let hasExactPostcode = false;
          let hasStreetNameMatch = false;
          let confidenceScore = 0.5;
          
          // Check for exact postcode match in title or subtitle
          if (postcodeRegex.test(title) || postcodeRegex.test(subtitle)) {
            hasExactPostcode = true;
            confidenceScore = 0.8;
          }
          
          // Check for street name match if provided
          if (streetName && 
              (title.toLowerCase().includes(streetName.toLowerCase()) || 
               subtitle.toLowerCase().includes(streetName.toLowerCase()))) {
            hasStreetNameMatch = true;
            confidenceScore = Math.min(confidenceScore + 0.2, 1.0);
          }
          
          // Only include if we have exact postcode match
          if (hasExactPostcode) {
            matchedListings.push({
              title,
              subtitle,
              url: href,
              hasExactPostcode,
              hasStreetNameMatch,
              confidenceScore
            });
          }
        });
        
        return {
          totalListings: listingCards.length,
          matchedListings: matchedListings
        };
      }, { postcode, streetName });
      
      return listings;
    });
    
    await browserSDK.close();
    
    if (!result || !result.totalListings) {
      return { status: "no_match", url: searchUrl, count: 0 };
    }
    
    const matchCount = result.matchedListings?.length || 0;
    return matchCount > 0
      ? { 
          status: "investigate", 
          url: searchUrl, 
          count: matchCount,
          matches: result.matchedListings,
          confidenceScore: Math.max(...(result.matchedListings?.map(m => m.confidenceScore) || [0.8]))
        }
      : { status: "no_match", url: searchUrl, count: 0 };
  } catch (error) {
    console.error(`Error scraping Airbnb for ${postcode}:`, error);
    return { status: "error", message: error.message, url: searchUrl };
  }
}

async function scrapeSpareRoom(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`WebSocket checking SpareRoom for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search_id=&mode=list&search=${encodeURIComponent(searchQuery)}`;
  
  try {
    const browserSDK = new BrowserSDK({
      endpoint: BRIGHT_DATA_WEBSOCKET_ENDPOINT,
      auth: {
        username: BRIGHT_DATA_USERNAME,
        password: BRIGHT_DATA_PASSWORD
      }
    });

    const result = await browserSDK.run(async (page) => {
      // Navigate to SpareRoom search
      await page.goto(searchUrl, { waitUntil: 'networkidle' });
      
      // Add human-like delay
      await page.waitForTimeout(1500 + Math.random() * 2000);
      
      // Wait for listings to load
      await page.waitForSelector('.listing-result', { timeout: 30000 }).catch(() => null);
      
      // Extract listings and check for exact postcode matches
      const listings = await page.evaluate((data) => {
        const { postcode, streetName } = data;
        const listingCards = document.querySelectorAll('.listing-result');
        const matchedListings = [];
        
        // Create regex for exact postcode matching
        const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
        
        listingCards.forEach((card, index) => {
          const titleElement = card.querySelector('h2 a, .listingTitle a');
          const addressElement = card.querySelector('.listingLocation, .address');
          const linkElement = card.querySelector('a[href*="flatshare_detail"]');
          
          const title = titleElement?.textContent?.trim() || `Room ${index + 1}`;
          const addressText = addressElement?.textContent?.trim() || '';
          const href = linkElement?.href || titleElement?.href || '';
          
          let hasExactPostcode = false;
          let hasStreetNameMatch = false;
          let confidenceScore = 0.5;
          
          // Check for exact postcode match in title or address
          if (postcodeRegex.test(title) || postcodeRegex.test(addressText)) {
            hasExactPostcode = true;
            confidenceScore = 0.8;
          }
          
          // Check for street name match if provided
          if (streetName && 
              (title.toLowerCase().includes(streetName.toLowerCase()) || 
               addressText.toLowerCase().includes(streetName.toLowerCase()))) {
            hasStreetNameMatch = true;
            confidenceScore = Math.min(confidenceScore + 0.2, 1.0);
          }
          
          // Only include if we have exact postcode match
          if (hasExactPostcode) {
            matchedListings.push({
              title,
              address: addressText,
              url: href,
              hasExactPostcode,
              hasStreetNameMatch,
              confidenceScore
            });
          }
        });
        
        return {
          totalListings: listingCards.length,
          matchedListings: matchedListings
        };
      }, { postcode, streetName });
      
      return listings;
    });
    
    await browserSDK.close();
    
    if (!result || !result.totalListings) {
      return { status: "no_match", url: searchUrl, count: 0 };
    }
    
    const matchCount = result.matchedListings?.length || 0;
    return matchCount > 0
      ? { 
          status: "investigate", 
          url: searchUrl, 
          count: matchCount,
          matches: result.matchedListings,
          confidenceScore: Math.max(...(result.matchedListings?.map(m => m.confidenceScore) || [0.8]))
        }
      : { status: "no_match", url: searchUrl, count: 0 };
  } catch (error) {
    console.error(`Error scraping SpareRoom for ${postcode}:`, error);
    return { status: "error", message: error.message, url: searchUrl };
  }
}

async function scrapeGumtree(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`WebSocket checking Gumtree for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  try {
    const browserSDK = new BrowserSDK({
      endpoint: BRIGHT_DATA_WEBSOCKET_ENDPOINT,
      auth: {
        username: BRIGHT_DATA_USERNAME,
        password: BRIGHT_DATA_PASSWORD
      }
    });

    const result = await browserSDK.run(async (page) => {
      // Navigate to Gumtree search
      await page.goto(searchUrl, { waitUntil: 'networkidle' });
      
      // Add human-like delay
      await page.waitForTimeout(2500 + Math.random() * 2000);
      
      // Wait for listings to load
      await page.waitForSelector('.natural, .listing-link', { timeout: 30000 }).catch(() => null);
      
      // Extract listings and check for exact postcode matches
      const listings = await page.evaluate((data) => {
        const { postcode, streetName } = data;
        const listingCards = document.querySelectorAll('.natural, .listing-link');
        const matchedListings = [];
        
        // Create regex for exact postcode matching
        const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
        
        listingCards.forEach((card, index) => {
          const titleElement = card.querySelector('h2 a, .listing-title a, a[data-q="ad-title"]');
          const locationElement = card.querySelector('.listing-location, .ad-location, .location');
          const linkElement = titleElement || card.querySelector('a[href*="/ad/"]');
          
          const title = titleElement?.textContent?.trim() || `Property ${index + 1}`;
          const location = locationElement?.textContent?.trim() || '';
          const href = linkElement?.href || '';
          
          let hasExactPostcode = false;
          let hasStreetNameMatch = false;
          let confidenceScore = 0.5;
          
          // Check for exact postcode match in title or location
          if (postcodeRegex.test(title) || postcodeRegex.test(location)) {
            hasExactPostcode = true;
            confidenceScore = 0.8;
          }
          
          // Check for street name match if provided
          if (streetName && 
              (title.toLowerCase().includes(streetName.toLowerCase()) || 
               location.toLowerCase().includes(streetName.toLowerCase()))) {
            hasStreetNameMatch = true;
            confidenceScore = Math.min(confidenceScore + 0.2, 1.0);
          }
          
          // Only include if we have exact postcode match
          if (hasExactPostcode) {
            matchedListings.push({
              title,
              location,
              url: href,
              hasExactPostcode,
              hasStreetNameMatch,
              confidenceScore
            });
          }
        });
        
        return {
          totalListings: listingCards.length,
          matchedListings: matchedListings
        };
      }, { postcode, streetName });
      
      return listings;
    });
    
    await browserSDK.close();
    
    if (!result || !result.totalListings) {
      return { status: "no_match", url: searchUrl, count: 0 };
    }
    
    const matchCount = result.matchedListings?.length || 0;
    return matchCount > 0
      ? { 
          status: "investigate", 
          url: searchUrl, 
          count: matchCount,
          matches: result.matchedListings,
          confidenceScore: Math.max(...(result.matchedListings?.map(m => m.confidenceScore) || [0.8]))
        }
      : { status: "no_match", url: searchUrl, count: 0 };
  } catch (error) {
    console.error(`Error scraping Gumtree for ${postcode}:`, error);
    return { status: "error", message: error.message, url: searchUrl };
  }
}
