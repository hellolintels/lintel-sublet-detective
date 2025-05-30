
import { PostcodeResult, TestResult } from './types.ts';
import { testScrapeAirbnb } from './airbnb-scraper.ts';
import { testScrapeSpareRoom } from './spareroom-scraper.ts';
import { testScrapeGumtree } from './gumtree-scraper.ts';

export async function testScrapePostcodes(postcodes: PostcodeResult[]): Promise<TestResult[]> {
  console.log(`Starting OS Data Hub boundary-based test scraping for ${postcodes.length} postcodes`);

  const results = [];
  
  for (const postcodeData of postcodes) {
    const boundaryInfo = postcodeData.boundary 
      ? `(OS boundary: SW ${postcodeData.boundary.southwest.lat}, ${postcodeData.boundary.southwest.lng} NE ${postcodeData.boundary.northeast.lat}, ${postcodeData.boundary.northeast.lng})`
      : '(no OS boundary)';
    
    console.log(`Testing postcode: ${postcodeData.postcode} ${boundaryInfo}`);
    
    // Special logging for G11 5AW test case with OS boundary
    if (postcodeData.postcode === "G11 5AW") {
      console.log(`🎯 Testing G11 5AW with OS Data Hub boundary to capture live listing with official postcode boundary`);
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
      
      // Log results for validation
      if (postcodeData.postcode === "G11 5AW") {
        console.log(`✅ G11 5AW OS boundary test completed - Airbnb status: ${result.airbnb.status}, method: ${result.airbnb.boundary_method}, count: ${result.airbnb.count}`);
      }
      
      results.push(result);
    } catch (error) {
      console.error(`Error testing postcode ${postcodeData.postcode}:`, error);
      results.push({
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: { status: "error", count: 0, message: error.message },
        spareroom: { status: "error", count: 0, message: error.message },
        gumtree: { status: "error", count: 0, message: error.message }
      });
    }
  }

  console.log(`OS Data Hub boundary-based test scraping completed for all ${postcodes.length} postcodes`);
  return results;
}
