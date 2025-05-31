
import { PostcodeResult } from './types.ts';
import { EnhancedScrapingBeeResults } from './enhanced-types.ts';
import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { runEnhancedScrapingBeeTests } from './enhanced-scrapingbee-runner.ts';

export class TestCoordinator {
  static async executeTestPipeline(testPostcodes: PostcodeResult[]): Promise<{
    coordsCount: number;
    enhancedResults: EnhancedScrapingBeeResults;
  }> {
    console.log(`🚀 Enhanced ScrapingBee API Test Pipeline - Production Ready`);
    console.log(`🎯 Running Enhanced ScrapingBee tests for ${testPostcodes.length} postcodes`);
    console.log(`🔧 Features: Smart proxy strategy, circuit breakers, geographic batching, credit optimization`);
    
    // Phase 1: Coordinate Lookup & Postcode Grouping
    console.log(`\n📍 Phase 1: Coordinate Lookup & Postcode Grouping`);
    const postcodesWithCoordinates = await addCoordinatesToPostcodes(testPostcodes);
    
    const coordsCount = postcodesWithCoordinates.filter(p => p.latitude && p.longitude).length;
    console.log(`✅ Coordinate lookup completed: ${coordsCount}/${testPostcodes.length} postcodes have precise coordinates`);
    
    // Phase 2: Enhanced ScrapingBee Testing
    console.log(`\n🧪 Phase 2: Enhanced ScrapingBee API Testing`);
    const enhancedResults = await runEnhancedScrapingBeeTests(postcodesWithCoordinates);
    
    console.log("\n🎉 Enhanced ScrapingBee test pipeline completed");
    
    return { coordsCount, enhancedResults };
  }
}
