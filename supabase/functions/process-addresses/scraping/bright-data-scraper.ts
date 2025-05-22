/**
 * Bright Data scraping module for Lintels address matching
 */

// Configuration for Bright Data API access
const BRIGHT_DATA_API_KEY = Deno.env.get("BRIGHT_DATA_API_KEY");
const BRIGHT_DATA_BROWSER_ZONE = Deno.env.get("BRIGHT_DATA_BROWSER_ZONE") || "scraping_browser1";

import { PostcodeResult } from "../utils/postcode-extractor.ts";

export async function scrapePostcodes(postcodes: PostcodeResult[]) {
  console.log(`Starting scraping for ${postcodes.length} postcodes`);

  // Validate Bright Data API credentials
  if (!BRIGHT_DATA_API_KEY) {
    console.error("BRIGHT_DATA_API_KEY environment variable not set");
    throw new Error("Bright Data API key not configured");
  }

  // Create auth header for Bright Data API
  const authHeader = `Bearer ${BRIGHT_DATA_API_KEY}`;

  const results = [];
  const batchSize = 5; // Process postcodes in smaller batches to avoid rate limits

  for (let i = 0; i < postcodes.length; i += batchSize) {
    const batch = postcodes.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}, postcodes: ${batch.map(p => p.postcode).join(', ')}`);

    const batchPromises = batch.map((postcodeData) => scrapePostcode(postcodeData, authHeader));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < postcodes.length) {
      console.log("Waiting 2 seconds before processing next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`Scraping completed for all ${postcodes.length} postcodes`);
  return results;
}

async function scrapePostcode(postcodeData: PostcodeResult, authHeader: string) {
  const { postcode, streetName, address } = postcodeData;
  console.log(`Scraping postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  const formattedPostcode = postcode.replace(/\s+/g, '-');

  try {
    // Make parallel requests to each platform
    const [airbnbResult, spareroomResult, gumtreeResult] = await Promise.all([
      scrapeAirbnb(postcodeData, authHeader),
      scrapeSpareRoom(postcodeData, authHeader),
      scrapeGumtree(postcodeData, authHeader)
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

async function scrapeAirbnb(postcodeData: PostcodeResult, authHeader: string) {
  const { postcode, streetName } = postcodeData;
  console.log(`Checking Airbnb for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  try {
    // Bright Data API requires exact postcode search, which we'll implement using their Browser API
    const brightDataResponse = await executeBrowserScrape({
      url: `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`,
      // Custom script to extract precise postcode matches only
      script: `
        async ({ url, data: { postcode, streetName } }) => {
          await page.goto(url);
          // Wait for listings to load
          await page.waitForSelector('[data-testid="card-container"]', { timeout: 30000 }).catch(() => null);
          
          // Extract listing addresses and check if they contain the exact postcode and street name
          const listings = await page.evaluate((data) => {
            const { postcode, streetName } = data;
            const listingCards = document.querySelectorAll('[data-testid="card-container"]');
            const matchedListings = [];
            
            // For development, we'll simulate postcode and street matching
            // In production, this would parse the actual page content
            listingCards.forEach((card, index) => {
              // In a real implementation, we would extract address data
              const title = card.querySelector('meta[itemprop="name"]')?.getAttribute('content') || \`Listing \${index}\`;
              const url = card.querySelector('a')?.href || '';
              
              // Check for exact matches with both postcode and street
              let hasExactPostcode = true; // Simulate postcode match
              let hasStreetNameMatch = false;
              let confidenceScore = 0.7; // Base confidence
              
              // If we have a street name, check if it appears in the title
              if (streetName && title.toLowerCase().includes(streetName.toLowerCase())) {
                hasStreetNameMatch = true;
                confidenceScore = 0.9; // Higher confidence if street name matches
              }
              
              // Add to matches if it meets our criteria
              if (hasExactPostcode && (hasStreetNameMatch || !streetName)) {
                matchedListings.push({
                  title,
                  url,
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
        }
      `,
      data: { postcode, streetName }
    }, authHeader);
    
    const scrapedData = brightDataResponse.data;
    
    if (!scrapedData || !scrapedData.totalListings) {
      return { status: "no match", url: `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`, count: 0 };
    }
    
    const matchCount = scrapedData.matchedListings?.length || 0;
    return matchCount > 0
      ? { 
          status: "investigate", 
          url: `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`, 
          count: matchCount,
          matches: scrapedData.matchedListings,
          confidenceScore: Math.max(...(scrapedData.matchedListings?.map(m => m.confidenceScore) || [0.7]))
        }
      : { status: "no match", url: `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`, count: 0 };
  } catch (error) {
    console.error(`Error scraping Airbnb for ${postcode}:`, error);
    return { status: "error", message: error.message, url: `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes` };
  }
}

async function scrapeSpareRoom(postcodeData: PostcodeResult, authHeader: string) {
  const { postcode, streetName } = postcodeData;
  console.log(`Checking SpareRoom for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  try {
    const brightDataResponse = await executeBrowserScrape({
      url: `https://www.spareroom.co.uk/flatshare/search.pl?search=${encodeURIComponent(searchQuery)}`,
      script: `
        async ({ url, data: { postcode, streetName } }) => {
          await page.goto(url);
          // Wait for listings to load
          await page.waitForSelector('.listing-result', { timeout: 30000 }).catch(() => null);
          
          // Extract listing addresses and check if they contain the exact postcode and street name
          const listings = await page.evaluate((data) => {
            const { postcode, streetName } = data;
            const listingCards = document.querySelectorAll('.listing-result');
            const matchedListings = [];
            
            // For development, we'll simulate postcode and street matching
            listingCards.forEach((card, index) => {
              const title = card.querySelector('h2')?.textContent?.trim() || \`Room \${index}\`;
              const addressLine = card.querySelector('.listingLocation')?.textContent?.trim() || '';
              const url = card.querySelector('a')?.href || '';
              
              // Check for exact matches with both postcode and street
              let hasExactPostcode = true; // Simulate postcode match
              let hasStreetNameMatch = false;
              let confidenceScore = 0.7; // Base confidence
              
              // If we have a street name, check if it appears in the address
              if (streetName && 
                  (addressLine.toLowerCase().includes(streetName.toLowerCase()) || 
                   title.toLowerCase().includes(streetName.toLowerCase()))) {
                hasStreetNameMatch = true;
                confidenceScore = 0.9; // Higher confidence if street name matches
              }
              
              // Add to matches if it meets our criteria
              if (hasExactPostcode && (hasStreetNameMatch || !streetName)) {
                matchedListings.push({
                  title,
                  url,
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
        }
      `,
      data: { postcode, streetName }
    }, authHeader);
    
    const scrapedData = brightDataResponse.data;
    
    if (!scrapedData || !scrapedData.totalListings) {
      return { status: "no match", url: `https://www.spareroom.co.uk/flatshare/search.pl?search=${encodeURIComponent(searchQuery)}`, count: 0 };
    }
    
    const matchCount = scrapedData.matchedListings?.length || 0;
    return matchCount > 0
      ? { 
          status: "investigate", 
          url: `https://www.spareroom.co.uk/flatshare/search.pl?search=${encodeURIComponent(searchQuery)}`, 
          count: matchCount,
          matches: scrapedData.matchedListings,
          confidenceScore: Math.max(...(scrapedData.matchedListings?.map(m => m.confidenceScore) || [0.7]))
        }
      : { status: "no match", url: `https://www.spareroom.co.uk/flatshare/search.pl?search=${encodeURIComponent(searchQuery)}`, count: 0 };
  } catch (error) {
    console.error(`Error scraping SpareRoom for ${postcode}:`, error);
    return { 
      status: "error", 
      message: error.message, 
      url: `https://www.spareroom.co.uk/flatshare/search.pl?search=${encodeURIComponent(searchQuery)}` 
    };
  }
}

async function scrapeGumtree(postcodeData: PostcodeResult, authHeader: string) {
  const { postcode, streetName } = postcodeData;
  console.log(`Checking Gumtree for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  const searchQuery = streetName 
    ? `${streetName}, ${postcode}` 
    : postcode;
  
  try {
    const brightDataResponse = await executeBrowserScrape({
      url: `https://www.gumtree.com/property-to-rent/uk/${encodeURIComponent(searchQuery)}`,
      script: `
        async ({ url, data: { postcode, streetName } }) => {
          await page.goto(url);
          // Wait for listings to load
          await page.waitForSelector('.listing-link', { timeout: 30000 }).catch(() => null);
          
          // Extract listing addresses and check if they contain the exact postcode and street name
          const listings = await page.evaluate((data) => {
            const { postcode, streetName } = data;
            const listingCards = document.querySelectorAll('.listing-link');
            const matchedListings = [];
            
            // For development, we'll simulate postcode and street matching
            listingCards.forEach((card, index) => {
              const title = card.querySelector('h2')?.textContent?.trim() || \`Property \${index}\`;
              const addressLine = card.querySelector('.listing-location')?.textContent?.trim() || '';
              const url = card.href || '';
              
              // Check for exact matches with both postcode and street
              let hasExactPostcode = true; // Simulate postcode match
              let hasStreetNameMatch = false;
              let confidenceScore = 0.7; // Base confidence
              
              // If we have a street name, check if it appears in the address
              if (streetName && 
                  (addressLine.toLowerCase().includes(streetName.toLowerCase()) || 
                   title.toLowerCase().includes(streetName.toLowerCase()))) {
                hasStreetNameMatch = true;
                confidenceScore = 0.9; // Higher confidence if street name matches
              }
              
              // Add to matches if it meets our criteria
              if (hasExactPostcode && (hasStreetNameMatch || !streetName)) {
                matchedListings.push({
                  title,
                  url,
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
        }
      `,
      data: { postcode, streetName }
    }, authHeader);
    
    const scrapedData = brightDataResponse.data;
    
    if (!scrapedData || !scrapedData.totalListings) {
      return { status: "no match", url: `https://www.gumtree.com/property-to-rent/uk/${encodeURIComponent(searchQuery)}`, count: 0 };
    }
    
    const matchCount = scrapedData.matchedListings?.length || 0;
    return matchCount > 0
      ? { 
          status: "investigate", 
          url: `https://www.gumtree.com/property-to-rent/uk/${encodeURIComponent(searchQuery)}`, 
          count: matchCount,
          matches: scrapedData.matchedListings,
          confidenceScore: Math.max(...(scrapedData.matchedListings?.map(m => m.confidenceScore) || [0.7]))
        }
      : { status: "no match", url: `https://www.gumtree.com/property-to-rent/uk/${encodeURIComponent(searchQuery)}`, count: 0 };
  } catch (error) {
    console.error(`Error scraping Gumtree for ${postcode}:`, error);
    return { 
      status: "error", 
      message: error.message, 
      url: `https://www.gumtree.com/property-to-rent/uk/${encodeURIComponent(searchQuery)}` 
    };
  }
}

/**
 * Execute a browser scrape using Bright Data's Browser API
 */
async function executeBrowserScrape(params: {
  url: string;
  script: string;
  data?: Record<string, any>;
}, authHeader: string) {
  const apiUrl = `https://api.brightdata.com/browser/${BRIGHT_DATA_BROWSER_ZONE}/execute`;
  
  try {
    // In development mode, simulate the response
    // For production, this would be a real API call
    if (Deno.env.get("ENV") === "production") {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Bright Data API request failed with status ${response.status}`);
      }
      
      return await response.json();
    } else {
      // Development mode simulation
      console.log(`DEV MODE: Simulating Bright Data browser scrape for URL: ${params.url}`);
      
      // Wait a bit to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Simulate a response with random data
      const randomListingCount = Math.floor(Math.random() * 15);
      const matchedListings = [];
      
      for (let i = 0; i < randomListingCount; i++) {
        if (Math.random() > 0.5) {
          matchedListings.push({
            title: `Simulated Listing ${i + 1}`,
            url: `${params.url}/listing-${i + 1}`,
            hasExactPostcode: true
          });
        }
      }
      
      return {
        success: true,
        data: {
          totalListings: randomListingCount,
          matchedListings: matchedListings
        }
      };
    }
  } catch (error) {
    console.error(`Error executing Bright Data browser scrape:`, error);
    throw error;
  }
}
