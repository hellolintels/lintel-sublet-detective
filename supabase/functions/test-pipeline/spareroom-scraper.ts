
import { PostcodeResult, ScrapingResult } from './types.ts';

export async function testScrapeSpareRoom(postcodeData: PostcodeResult): Promise<ScrapingResult> {
  const { postcode, streetName, address } = postcodeData;
  console.log(`Testing SpareRoom for postcode: ${postcode}, Street: ${streetName || "Unknown"}`);
  
  // Use full address for better precision
  const searchQuery = address || (streetName ? `${streetName}, ${postcode}` : postcode);
  const searchUrl = `https://www.spareroom.co.uk/flatshare/?search_id=&mode=list&search=${encodeURIComponent(searchQuery)}`;
  
  console.log(`Using full address search: ${searchQuery}`);
  
  // Simulated results with full address precision
  const simulatedCount = Math.floor(Math.random() * 2); // 0-1 random matches (more conservative)
  
  return simulatedCount > 0
    ? { 
        status: "investigate", 
        url: searchUrl, 
        count: simulatedCount,
        search_method: "full-address",
        precision: "high",
        message: `Found ${simulatedCount} potential matches using full address`
      }
    : { 
        status: "no_match", 
        url: searchUrl, 
        count: 0,
        search_method: "full-address",
        precision: "high"
      };
}
