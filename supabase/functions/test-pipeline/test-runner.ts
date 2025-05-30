
import { PostcodeResult, TestResult } from './types.ts';
import { testScrapeAirbnb } from './airbnb-scraper.ts';
import { testScrapeSpareRoom } from './spareroom-scraper.ts';
import { testScrapeGumtree } from './gumtree-scraper.ts';

export async function testScrapePostcodes(postcodes: PostcodeResult[]): Promise<TestResult[]> {
  console.log(`🚀 Starting real scraping test with enhanced precision for ${postcodes.length} postcodes`);

  const results = [];
  
  for (const postcodeData of postcodes) {
    const coordinateInfo = postcodeData.latitude && postcodeData.longitude 
      ? `(Coords: ${postcodeData.latitude}, ${postcodeData.longitude})`
      : '(no coordinates)';
    
    console.log(`\n🎯 Testing postcode: ${postcodeData.postcode} ${coordinateInfo}`);
    
    // Special logging for test cases
    if (postcodeData.postcode === "G11 5AW") {
      console.log(`🔍 Testing G11 5AW with enhanced precision and real Bright Data scraping`);
    }
    
    try {
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: await testScrapeAirbnb(postcodeData),
        spareroom: await testScrapeSpareRoom(postcodeData),
        gumtree: await testScrapeGumtree(postcodeData)
      };
      
      // Enhanced logging for validation
      console.log(`📊 ${postcodeData.postcode} results:`);
      console.log(`  Airbnb: ${result.airbnb.status} (${result.airbnb.count} matches, method: ${result.airbnb.search_method})`);
      console.log(`  SpareRoom: ${result.spareroom.status} (${result.spareroom.count} matches)`);
      console.log(`  Gumtree: ${result.gumtree.status} (${result.gumtree.count} matches)`);
      
      if (result.airbnb.status === "too_broad") {
        console.log(`⚠️ ${postcodeData.postcode}: Airbnb map area too broad - need more precise search parameters`);
      }
      
      results.push(result);
    } catch (error) {
      console.error(`❌ Error testing postcode ${postcodeData.postcode}:`, error);
      results.push({
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: { 
          status: "error", 
          count: 0, 
          search_method: "unknown",
          boundary_method: "error",
          precision: "failed",
          message: error.message 
        },
        spareroom: { 
          status: "error", 
          count: 0, 
          search_method: "unknown",
          boundary_method: "error", 
          precision: "failed",
          message: error.message 
        },
        gumtree: { 
          status: "error", 
          count: 0, 
          search_method: "unknown",
          boundary_method: "error",
          precision: "failed", 
          message: error.message 
        }
      });
    }
  }

  console.log(`✅ Enhanced precision test completed for all ${postcodes.length} postcodes`);
  return results;
}
