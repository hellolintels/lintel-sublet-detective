
import { PostcodeResult } from "../utils/postcode-extractor.ts";

// ScrapingBee API key
const SCRAPINGBEE_API_KEY = "4HPJVN24L1H1SQV5CKYKU5N6ROTWESA4W0LJOGPJBZDEYHIUT4SVCISLWGTS8ZLM27F13LBYZTWEUM3L";

export interface ScrapeResult {
  postcode: string;
  airbnb: string;
  spareroom: string;
  gumtree: string;
}

/**
 * Get postcode from coordinates using postcodes.io API
 */
async function getPostcodeFromCoords(lat: string, lng: string): Promise<string | null> {
  try {
    console.log(`Getting postcode for coordinates: ${lat}, ${lng}`);
    const response = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}`);
    const data = await response.json();
    if (data.status === 200 && data.result && data.result.length > 0) {
      console.log(`Found postcode: ${data.result[0].postcode}`);
      return data.result[0].postcode;
    }
    console.log("No postcode found for coordinates");
    return null;
  } catch (error) {
    console.error("Error getting postcode from coordinates:", error);
    return null;
  }
}

/**
 * Construct AirBnb map URL with parameters
 */
function constructAirbnbMapUrl(postcode: string, lat: string, lng: string): string {
  const zoom = 18.86;
  const delta = 0.0005;
  const neLat = parseFloat(lat) + delta;
  const neLng = parseFloat(lng) + delta;
  const swLat = parseFloat(lat) - delta;
  const swLng = parseFloat(lng) - delta;
  const baseUrl = `https://www.airbnb.co.uk/s/${postcode}/homes`;
  const params = `?refinement_paths[]=homes&flexible_trip_lengths[]=one_week&price_filter_input_type=0&price_filter_num_nights=5&search_type=user_map_move&query=${postcode}&map_toggle=true&ne_lat=${neLat}&ne_lng=${neLng}&sw_lat=${swLat}&sw_lng=${swLng}&zoom=${zoom}&search_by_map=true&search_mode=regular_search&zoom_level=${zoom}`;
  return baseUrl + params;
}

/**
 * Scrapes address data using ScrapingBee
 * @param postcodes List of postcodes to scrape
 * @returns Results for each postcode
 */
export async function scrapePostcodes(postcodes: PostcodeResult[]): Promise<ScrapeResult[]> {
  console.log(`ScrapingBee: Scraping ${postcodes.length} postcodes`);
  
  // For testing, limit to first 10 postcodes
  const limitedPostcodes = postcodes.slice(0, 10);
  console.log(`ScrapingBee: Limited to ${limitedPostcodes.length} postcodes for testing`);
  
  const results: ScrapeResult[] = [];
  
  for (const item of limitedPostcodes) {
    console.log(`ScrapingBee: Processing ${item.postcode}`);
    
    const address = item.address || "";
    const postcode = item.postcode.replace(/\s/g, "");
    
    // Initialize result with default "No match" values
    const result: ScrapeResult = {
      postcode: item.postcode,
      airbnb: "No match",
      spareroom: "No match",
      gumtree: "No match",
    };
    
    // Airbnb scraping
    try {
      console.log(`ScrapingBee: Scraping Airbnb for ${postcode}`);
      
      // ScrapingBee API call
      const url = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(`https://www.airbnb.com/s/${postcode}/homes`)}&render_js=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`ScrapingBee Airbnb API error: ${response.status} ${response.statusText}`);
        throw new Error(`ScrapingBee API error: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check if there are listings in the postcode area
      if (html.includes(postcode) && html.includes("data-testid=\"card-container\"")) {
        console.log(`ScrapingBee: Found Airbnb listings for ${postcode}`);
        // For this test implementation, we'll mark it as "Investigate" if we find any listings
        const mapLink = `https://www.airbnb.co.uk/s/${postcode}/homes?map=true`;
        result.airbnb = `=HYPERLINK("${mapLink}","Investigate")`;
      } else {
        console.log(`ScrapingBee: No Airbnb listings found for ${postcode}`);
      }
    } catch (error) {
      console.error(`ScrapingBee: Error scraping Airbnb for ${postcode}:`, error);
    }
    
    // SpareRoom scraping - simplified for testing
    try {
      console.log(`ScrapingBee: Scraping SpareRoom for ${postcode}`);
      
      const url = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(`https://www.spareroom.co.uk/flatshare/?search=${postcode}`)}&render_js=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`ScrapingBee SpareRoom API error: ${response.status} ${response.statusText}`);
        throw new Error(`ScrapingBee API error: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check if there are listings in the postcode area
      if (html.includes("listing-") && html.includes(postcode)) {
        console.log(`ScrapingBee: Found SpareRoom listings for ${postcode}`);
        const mapLink = `https://www.spareroom.co.uk/flatshare/?search=${postcode}`;
        result.spareroom = `=HYPERLINK("${mapLink}","Investigate")`;
      } else {
        console.log(`ScrapingBee: No SpareRoom listings found for ${postcode}`);
      }
    } catch (error) {
      console.error(`ScrapingBee: Error scraping SpareRoom for ${postcode}:`, error);
    }
    
    // Gumtree scraping - simplified for testing
    try {
      console.log(`ScrapingBee: Scraping Gumtree for ${postcode}`);
      
      const url = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(`https://www.gumtree.com/search?search_location=${postcode}`)}&render_js=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`ScrapingBee Gumtree API error: ${response.status} ${response.statusText}`);
        throw new Error(`ScrapingBee API error: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check if there are listings in the postcode area
      if (html.includes("listing-") && html.includes(postcode)) {
        console.log(`ScrapingBee: Found Gumtree listings for ${postcode}`);
        const mapLink = `https://www.gumtree.com/search?search_location=${postcode}`;
        result.gumtree = `=HYPERLINK("${mapLink}","Investigate")`;
      } else {
        console.log(`ScrapingBee: No Gumtree listings found for ${postcode}`);
      }
    } catch (error) {
      console.error(`ScrapingBee: Error scraping Gumtree for ${postcode}:`, error);
    }
    
    results.push(result);
    console.log(`ScrapingBee: Completed processing ${postcode}`);
  }
  
  return results;
}
