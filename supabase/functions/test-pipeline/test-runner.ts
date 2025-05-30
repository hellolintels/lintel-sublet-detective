
import { PostcodeResult, TestResult } from './types.ts';
import { testScrapeAirbnb } from './airbnb-scraper.ts';
import { testScrapeSpareRoom } from './spareroom-scraper.ts';
import { testScrapeGumtree } from './gumtree-scraper.ts';

export async function testScrapePostcodes(postcodes: PostcodeResult[]): Promise<TestResult[]> {
  console.log(`Starting postcode-area focused test scraping for ${postcodes.length} postcodes`);

  const results = [];
  
  for (const postcodeData of postcodes) {
    console.log(`Testing postcode: ${postcodeData.postcode} ${postcodeData.latitude && postcodeData.longitude ? `(${postcodeData.latitude}, ${postcodeData.longitude})` : '(no coordinates)'}`);
    
    // Special logging for G11 5AW test case
    if (postcodeData.postcode === "G11 5AW") {
      console.log(`🎯 Testing G11 5AW with postcode-area focus to capture live listing`);
    }
    
    try {
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        airbnb: await testScrapeAirbnb(postcodeData),
        spareroom: await testScrapeSpareRoom(postcodeData),
        gumtree: await testScrapeGumtree(postcodeData)
      };
      
      // Log results for validation
      if (postcodeData.postcode === "G11 5AW") {
        console.log(`✅ G11 5AW postcode-area test completed - Airbnb status: ${result.airbnb.status}, count: ${result.airbnb.count}`);
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
        airbnb: { status: "error", count: 0, message: error.message },
        spareroom: { status: "error", count: 0, message: error.message },
        gumtree: { status: "error", count: 0, message: error.message }
      });
    }
  }

  console.log(`Postcode-area focused test scraping completed for all ${postcodes.length} postcodes`);
  return results;
}
