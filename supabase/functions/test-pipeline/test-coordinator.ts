import { addCoordinatesToPostcodes } from './coordinate-lookup.ts';
import { testScrapePostcodes } from './test-runner.ts';

export class TestCoordinator {
  static async executeTestPipeline(testPostcodes: any[]) {
    console.log(`🎯 Enhanced Test Pipeline: Starting accuracy-focused testing for ${testPostcodes.length} postcodes`);
    
    // Phase 1: Add coordinates for precision
    const postcodesWithCoords = await addCoordinatesToPostcodes(testPostcodes);
    const coordsCount = postcodesWithCoords.filter(p => p.latitude && p.longitude).length;
    
    console.log(`📍 Coordinate enhancement: ${coordsCount}/${testPostcodes.length} postcodes now have precise coordinates`);
    
    // Phase 2: Run accuracy-focused testing
    console.log(`🎯 Phase 2: Running enhanced accuracy tests with location validation`);
    const enhancedResults = await testScrapePostcodes(postcodesWithCoords);
    
    console.log(`✅ Enhanced accuracy pipeline completed successfully`);
    
    return {
      coordsCount,
      enhancedResults
    };
  }
}
