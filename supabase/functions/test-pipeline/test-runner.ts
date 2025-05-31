
import { PostcodeResult, TestResult } from './types.ts';
import { runAccuracyTests, AccuracyTestSummary } from './accuracy-test-runner.ts';

export async function testScrapePostcodes(postcodes: PostcodeResult[]): Promise<{
  results: TestResult[];
  accuracySummary: AccuracyTestSummary;
}> {
  console.log(`🚀 Starting enhanced accuracy testing for ${postcodes.length} postcodes`);
  console.log(`🎯 Focus: Precise postcode/lat+long level validation`);

  // Run the accuracy-focused tests
  const { results, summary } = await runAccuracyTests(postcodes);

  console.log(`✅ Enhanced accuracy testing completed with ${summary.accuracyStats.highAccuracy} high-accuracy results`);
  
  return {
    results,
    accuracySummary: summary
  };
}
