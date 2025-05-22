
/**
 * ScrapingBee scraper implementation for Lintels
 */

import { extractPostcodesFromContact } from "../utils/postcode-extractor.ts";

interface ScrapingBeeOptions {
  url: string;
  params?: Record<string, any>;
}

interface ExtractRules {
  selector: string;
  type: string;
  output: Record<string, string>;
}

/**
 * Perform a scraping request to ScrapingBee API
 * @param options The options for the ScrapingBee request
 * @returns The response data
 */
async function scrapingBeeRequest(options: ScrapingBeeOptions): Promise<any> {
  const apiKey = Deno.env.get("SCRAPING_BEE_API_KEY");
  if (!apiKey) {
    throw new Error("SCRAPING_BEE_API_KEY environment variable is not set");
  }

  // Construct the ScrapingBee API URL
  const baseUrl = "https://app.scrapingbee.com/api/v1";
  const encodedUrl = encodeURIComponent(options.url);
  let apiUrl = `${baseUrl}?api_key=${apiKey}&url=${encodedUrl}`;

  // Add any additional parameters
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      apiUrl += `&${key}=${encodeURIComponent(
        typeof value === "object" ? JSON.stringify(value) : String(value)
      )}`;
    }
  }

  // Make the request to ScrapingBee API
  console.log(`Making ScrapingBee request for URL: ${options.url}`);
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ScrapingBee API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Handle different response types
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`ScrapingBee request failed:`, error);
    throw error;
  }
}

/**
 * Check if an Airbnb listing matches a given postcode
 * @param postcode The postcode to match against
 * @param listing The listing data
 * @returns True if matches, false otherwise
 */
async function matchAirbnbListing(
  postcode: string,
  listing: any
): Promise<{ matches: boolean; url?: string }> {
  try {
    // Extract location data from listing
    let listingPostcode = null;
    const lat = listing.lat;
    const lng = listing.lng;
    
    if (listing.address) {
      // Try to extract postcode from address
      const addressParts = listing.address.split(" ");
      listingPostcode = addressParts.length > 0 ? addressParts[addressParts.length - 1] : null;
    } else if (lat && lng) {
      // Get postcode from coordinates using postcodes.io API
      try {
        const response = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}`);
        const data = await response.json();
        if (data.status === 200 && data.result && data.result.length > 0) {
          listingPostcode = data.result[0].postcode;
        }
      } catch (error) {
        console.error("Error getting postcode from coordinates:", error);
      }
    }

    // Compare postcodes (normalized)
    if (listingPostcode && 
        listingPostcode.replace(/\s/g, "").toLowerCase() === 
        postcode.replace(/\s/g, "").toLowerCase()) {
      
      // Construct map URL for investigation
      const mapUrl = constructAirbnbMapUrl(postcode, lat, lng);
      return { matches: true, url: mapUrl };
    }
    
    return { matches: false };
  } catch (error) {
    console.error("Error matching Airbnb listing:", error);
    return { matches: false };
  }
}

/**
 * Construct an Airbnb map URL for a specific location
 * @param postcode The postcode
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted Airbnb map URL
 */
function constructAirbnbMapUrl(postcode: string, lat?: string, lng?: string): string {
  // Default zoom and deltas if no coordinates provided
  const zoom = 18.86;
  const delta = 0.0005;
  
  // Use provided coordinates or defaults
  const latitude = lat ? parseFloat(lat) : 0;
  const longitude = lng ? parseFloat(lng) : 0;
  
  // Calculate map boundaries
  const neLat = latitude + delta;
  const neLng = longitude + delta;
  const swLat = latitude - delta;
  const swLng = longitude - delta;
  
  // Construct URL with map parameters
  const baseUrl = `https://www.airbnb.co.uk/s/${encodeURIComponent(postcode)}/homes`;
  const params = `?refinement_paths[]=homes&flexible_trip_lengths[]=one_week&price_filter_input_type=0&price_filter_num_nights=5&search_type=user_map_move&query=${encodeURIComponent(postcode)}&map_toggle=true&ne_lat=${neLat}&ne_lng=${neLng}&sw_lat=${swLat}&sw_lng=${swLng}&zoom=${zoom}&search_by_map=true&search_mode=regular_search&zoom_level=${zoom}`;
  
  return baseUrl + params;
}

/**
 * Check for matches for a list of postcodes on platforms
 * @param contact The contact with address file
 * @param testMode If true, only check first 10 postcodes
 * @returns Object with results for each platform
 */
export async function checkPostcodesWithScrapingBee(
  contact: any,
  testMode = true
): Promise<Record<string, any>> {
  console.log(`Starting ScrapingBee scraper for contact ID: ${contact.id}`);
  console.log(`ScrapingBee test mode: ${testMode ? "ON (10 addresses max)" : "OFF"}`);
  
  // Extract postcodes from the uploaded file
  const postcodes = extractPostcodesFromContact(contact);
  console.log(`Extracted ${postcodes.length} postcodes`);
  
  // Limit to first 10 postcodes in test mode
  const postcodesToProcess = testMode && postcodes.length > 10 
    ? postcodes.slice(0, 10) 
    : postcodes;
  
  console.log(`Will process ${postcodesToProcess.length} postcodes`);
  
  // Prepare results container
  const results: Record<string, any> = {
    airbnb: {},
    spareroom: {},
    gumtree: {}
  };
  
  // Process each postcode
  for (const postcode of postcodesToProcess) {
    console.log(`Processing postcode: ${postcode}`);
    const normalizedPostcode = postcode.replace(/\s/g, "");
    
    // Initialize results for this postcode
    results.airbnb[normalizedPostcode] = { matches: false };
    results.spareroom[normalizedPostcode] = { matches: false };
    results.gumtree[normalizedPostcode] = { matches: false };
    
    // Check Airbnb
    try {
      await checkAirbnb(normalizedPostcode, results.airbnb);
    } catch (error) {
      console.error(`Error checking Airbnb for ${postcode}:`, error);
    }
    
    // Check SpareRoom
    try {
      await checkSpareRoom(normalizedPostcode, results.spareroom);
    } catch (error) {
      console.error(`Error checking SpareRoom for ${postcode}:`, error);
    }
    
    // Check Gumtree
    try {
      await checkGumtree(normalizedPostcode, results.gumtree);
    } catch (error) {
      console.error(`Error checking Gumtree for ${postcode}:`, error);
    }
    
    // Pause between postcodes to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`ScrapingBee scraper completed for ${postcodesToProcess.length} postcodes`);
  return results;
}

/**
 * Check if a postcode appears on Airbnb
 * @param postcode The postcode to check
 * @param results The results object to update
 */
async function checkAirbnb(postcode: string, results: Record<string, any>): Promise<void> {
  console.log(`Checking Airbnb for postcode: ${postcode}`);
  
  try {
    const response = await scrapingBeeRequest({
      url: `https://www.airbnb.com/s/${postcode}/homes`,
      params: {
        render_js: true,
        extract_rules: {
          listings: {
            selector: 'div[data-testid="card-container"]',
            type: "list",
            output: {
              url: "a@href",
              address: 'div[data-testid="listing-card-subtitle"]',
              lat: 'meta[name="geo:lat"]@content',
              lng: 'meta[name="geo:lng"]@content'
            }
          }
        }
      }
    });
    
    // Process listings
    const listings = response.listings || [];
    console.log(`Found ${listings.length} Airbnb listings for ${postcode}`);
    
    for (const listing of listings) {
      const match = await matchAirbnbListing(postcode, listing);
      if (match.matches && match.url) {
        results[postcode] = {
          matches: true,
          message: "Investigate",
          url: match.url
        };
        console.log(`Match found on Airbnb for ${postcode}`);
        return;
      }
    }
    
    console.log(`No matches found on Airbnb for ${postcode}`);
  } catch (error) {
    console.error(`Error in checkAirbnb for ${postcode}:`, error);
    results[postcode] = {
      matches: false,
      error: `Error checking Airbnb: ${error.message}`
    };
  }
}

/**
 * Check if a postcode appears on SpareRoom
 * @param postcode The postcode to check
 * @param results The results object to update
 */
async function checkSpareRoom(postcode: string, results: Record<string, any>): Promise<void> {
  console.log(`Checking SpareRoom for postcode: ${postcode}`);
  
  try {
    const searchResponse = await scrapingBeeRequest({
      url: `https://www.spareroom.co.uk/flatshare/?search=${postcode}`,
      params: {
        render_js: true,
        extract_rules: {
          listings: {
            selector: "article.listing",
            type: "list",
            output: { url: "a@href" }
          }
        }
      }
    });
    
    const listings = searchResponse.listings || [];
    console.log(`Found ${listings.length} SpareRoom listings for ${postcode}`);
    
    // Check each listing for postcode match
    for (const listing of listings) {
      if (!listing.url) continue;
      
      // Ensure URL is absolute
      const listingUrl = listing.url.startsWith("http") 
        ? listing.url 
        : `https://www.spareroom.co.uk${listing.url}`;
      
      try {
        const listingResponse = await scrapingBeeRequest({
          url: listingUrl,
          params: {
            render_js: true,
            extract_rules: {
              lat: 'div[id="map"]@data-lat',
              lng: 'div[id="map"]@data-lng'
            }
          }
        });
        
        const lat = listingResponse.lat;
        const lng = listingResponse.lng;
        
        if (lat && lng) {
          // Check if coordinates match postcode
          const response = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}`);
          const data = await response.json();
          
          if (data.status === 200 && data.result && data.result.length > 0) {
            const listingPostcode = data.result[0].postcode.replace(/\s/g, "");
            
            if (listingPostcode.toLowerCase() === postcode.toLowerCase()) {
              const mapUrl = `${listingUrl}#map`;
              results[postcode] = {
                matches: true,
                message: "Investigate",
                url: mapUrl
              };
              console.log(`Match found on SpareRoom for ${postcode}`);
              return;
            }
          }
        }
      } catch (error) {
        console.error(`Error checking SpareRoom listing ${listing.url}:`, error);
      }
    }
    
    console.log(`No matches found on SpareRoom for ${postcode}`);
  } catch (error) {
    console.error(`Error in checkSpareRoom for ${postcode}:`, error);
    results[postcode] = {
      matches: false,
      error: `Error checking SpareRoom: ${error.message}`
    };
  }
}

/**
 * Check if a postcode appears on Gumtree
 * @param postcode The postcode to check
 * @param results The results object to update
 */
async function checkGumtree(postcode: string, results: Record<string, any>): Promise<void> {
  console.log(`Checking Gumtree for postcode: ${postcode}`);
  
  try {
    const searchResponse = await scrapingBeeRequest({
      url: `https://www.gumtree.com/search?search_location=${postcode}`,
      params: {
        render_js: true,
        extract_rules: {
          listings: {
            selector: "div.listing",
            type: "list",
            output: {
              url: "a@href",
              title: "h1.listing-title",
              location: "span.listing-location",
              description: "div.listing-description"
            }
          }
        }
      }
    });
    
    const listings = searchResponse.listings || [];
    console.log(`Found ${listings.length} Gumtree listings for ${postcode}`);
    
    for (const listing of listings.slice(0, 5)) { // Limit to first 5 listings
      if (!listing.url) continue;
      
      // Get listing detail
      const listingUrl = listing.url.startsWith("http") 
        ? listing.url 
        : `https://www.gumtree.com${listing.url}`;
        
      try {
        // Check for postcode in listing details
        const title = (listing.title || "").toLowerCase();
        const location = (listing.location || "").toLowerCase();
        const description = (listing.description || "").toLowerCase();
        
        // Check for the postcode in listing text
        if (title.includes(postcode.toLowerCase()) || 
            location.includes(postcode.toLowerCase()) || 
            description.includes(postcode.toLowerCase())) {
          const mapUrl = `${listingUrl}#map`;
          results[postcode] = {
            matches: true,
            message: "Investigate",
            url: mapUrl
          };
          console.log(`Match found on Gumtree for ${postcode}`);
          return;
        }
        
        // Check first part of postcode (e.g., "SW1")
        const postcodePrefix = postcode.substring(0, 3).toLowerCase();
        if (title.includes(postcodePrefix) || 
            location.includes(postcodePrefix)) {
          const mapUrl = `${listingUrl}#map`;
          results[postcode] = {
            matches: true,
            message: "Investigate",
            url: mapUrl
          };
          console.log(`Partial match found on Gumtree for ${postcode}`);
          return;
        }
      } catch (error) {
        console.error(`Error checking Gumtree listing ${listing.url}:`, error);
      }
    }
    
    console.log(`No matches found on Gumtree for ${postcode}`);
  } catch (error) {
    console.error(`Error in checkGumtree for ${postcode}:`, error);
    results[postcode] = {
      matches: false,
      error: `Error checking Gumtree: ${error.message}`
    };
  }
}
