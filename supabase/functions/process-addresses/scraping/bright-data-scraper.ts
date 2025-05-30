
/**
 * Bright Data WebSocket Browser API scraping module for Lintels address matching
 */

import { PostcodeResult } from "../utils/postcode-extractor.ts";

// Configuration for Bright Data WebSocket API - only need the endpoint URL with embedded credentials
const BRIGHT_DATA_WEBSOCKET_ENDPOINT = Deno.env.get("BRIGHT_DATA_WEBSOCKET_ENDPOINT");

export async function scrapePostcodes(postcodes: PostcodeResult[]) {
  console.log(`Starting WebSocket scraping for ${postcodes.length} postcodes`);

  // Validate Bright Data WebSocket endpoint
  if (!BRIGHT_DATA_WEBSOCKET_ENDPOINT) {
    console.error("Bright Data WebSocket endpoint not configured");
    throw new Error("Bright Data WebSocket endpoint not configured");
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

async function executeWebSocketScraping(url: string, postcodeData: PostcodeResult, platform: string) {
  const { postcode, streetName } = postcodeData;
  
  try {
    // Create a direct WebSocket connection to Bright Data
    const ws = new WebSocket(BRIGHT_DATA_WEBSOCKET_ENDPOINT!);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout'));
      }, 60000); // 60 second timeout

      ws.onopen = () => {
        console.log(`WebSocket connected for ${platform} scraping`);
        
        // Send scraping command to Bright Data
        const command = {
          action: 'navigate_and_extract',
          url: url,
          extractors: {
            listings: {
              selector: getListingSelector(platform),
              extract: 'text'
            },
            totalCount: {
              selector: getTotalCountSelector(platform),
              extract: 'text'
            }
          },
          postcode: postcode,
          streetName: streetName
        };
        
        ws.send(JSON.stringify(command));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          clearTimeout(timeout);
          ws.close();
          
          // Process the extracted data
          const result = processScrapingResult(data, postcodeData, platform, url);
          resolve(result);
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      };

      ws.onclose = () => {
        clearTimeout(timeout);
      };
    });
  } catch (error) {
    console.error(`WebSocket error for ${platform}:`, error);
    return { status: "error", message: error.message, url };
  }
}

function getListingSelector(platform: string): string {
  switch (platform) {
    case 'airbnb':
      return '[data-testid="card-container"]';
    case 'spareroom':
      return '.listing-result';
    case 'gumtree':
      return '.natural, .listing-link';
    default:
      return '.listing';
  }
}

function getTotalCountSelector(platform: string): string {
  switch (platform) {
    case 'airbnb':
      return '[data-testid="homes-search-results-count"]';
    case 'spareroom':
      return '.results-count';
    case 'gumtree':
      return '.results-summary';
    default:
      return '.count';
  }
}

function processScrapingResult(data: any, postcodeData: PostcodeResult, platform: string, url: string) {
  const { postcode, streetName } = postcodeData;
  
  if (!data || !data.listings) {
    return { status: "no_match", url, count: 0 };
  }

  const listings = Array.isArray(data.listings) ? data.listings : [];
  const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
  
  const matchedListings = listings.filter((listing: any) => {
    const text = listing.text || '';
    const hasExactPostcode = postcodeRegex.test(text);
    const hasStreetNameMatch = streetName ? text.toLowerCase().includes(streetName.toLowerCase()) : false;
    
    return hasExactPostcode;
  }).map((listing: any) => ({
    title: listing.text?.substring(0, 100) || `${platform} listing`,
    hasExactPostcode: true,
    hasStreetNameMatch: streetName ? listing.text?.toLowerCase().includes(streetName.toLowerCase()) : false,
    confidenceScore: 0.8
  }));

  const matchCount = matchedListings.length;
  
  return matchCount > 0
    ? { 
        status: "investigate", 
        url, 
        count: matchCount,
        matches: matchedListings,
        confidenceScore: Math.max(...matchedListings.map(m => m.confidenceScore))
      }
    : { status: "no_match", url, count: 0 };
}

async function scrapeAirbnb(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`WebSocket checking Airbnb for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
  
  return executeWebSocketScraping(searchUrl, postcodeData, 'airbnb');
}

async function scrapeSpareRoom(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`WebSocket checking SpareRoom for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search_id=&mode=list&search=${encodeURIComponent(searchQuery)}`;
  
  return executeWebSocketScraping(searchUrl, postcodeData, 'spareroom');
}

async function scrapeGumtree(postcodeData: PostcodeResult) {
  const { postcode, streetName } = postcodeData;
  console.log(`WebSocket checking Gumtree for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  const searchUrl = `https://www.gumtree.com/search?featured_filter=false&urgent_filter=false&sort=date&search_scope=false&photos_filter=false&search_category=property-to-rent&q=${encodeURIComponent(searchQuery)}`;
  
  return executeWebSocketScraping(searchUrl, postcodeData, 'gumtree');
}
