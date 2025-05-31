
import { PostcodeResult, TestResult } from './types.ts';
import { testScrapeAirbnbWithAccuracy } from './enhanced-airbnb-scraper.ts';
import { testScrapeSpareRoom } from './spareroom-scraper.ts';
import { testScrapeGumtree } from './gumtree-scraper.ts';
import { EnhancedHTMLAnalyzer } from './enhanced-html-analyzer.ts';

export interface AccuracyTestSummary {
  totalTested: number;
  accuracyStats: {
    highAccuracy: number;
    mediumAccuracy: number;
    lowAccuracy: number;
  };
  platformStats: {
    airbnb: { investigated: number; noMatch: number; errors: number };
    spareroom: { investigated: number; noMatch: number; errors: number };
    gumtree: { investigated: number; noMatch: number; errors: number };
  };
  postcodeValidation: {
    exactMatches: number;
    partialMatches: number;
    noMatches: number;
  };
  recommendations: string[];
}

export async function runAccuracyTests(postcodes: PostcodeResult[]): Promise<{
  results: TestResult[];
  summary: AccuracyTestSummary;
}> {
  console.log(`🎯 Starting accuracy-focused testing for ${postcodes.length} postcodes`);
  console.log(`📍 Test postcodes: ${postcodes.map(p => p.postcode).join(', ')}`);
  
  const results: TestResult[] = [];
  const summary: AccuracyTestSummary = {
    totalTested: postcodes.length,
    accuracyStats: { highAccuracy: 0, mediumAccuracy: 0, lowAccuracy: 0 },
    platformStats: {
      airbnb: { investigated: 0, noMatch: 0, errors: 0 },
      spareroom: { investigated: 0, noMatch: 0, errors: 0 },
      gumtree: { investigated: 0, noMatch: 0, errors: 0 }
    },
    postcodeValidation: { exactMatches: 0, partialMatches: 0, noMatches: 0 },
    recommendations: []
  };

  for (let i = 0; i < postcodes.length; i++) {
    const postcodeData = postcodes[i];
    const coordinateInfo = postcodeData.latitude && postcodeData.longitude 
      ? `(${postcodeData.latitude}, ${postcodeData.longitude})`
      : '(no coordinates)';
    
    console.log(`\n🎯 [${i + 1}/${postcodes.length}] Testing: ${postcodeData.postcode} ${coordinateInfo}`);
    console.log(`📍 Address: ${postcodeData.address}`);
    console.log(`🛣️ Street: ${postcodeData.streetName || 'Unknown'}`);
    
    try {
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        coordinates: postcodeData.latitude && postcodeData.longitude ? {
          lat: postcodeData.latitude,
          lng: postcodeData.longitude
        } : undefined,
        airbnb: await testScrapeAirbnbWithAccuracy(postcodeData),
        spareroom: await testScrapeSpareRoom(postcodeData),
        gumtree: await testScrapeGumtree(postcodeData)
      };
      
      // Analyze results for accuracy
      this.analyzeResultAccuracy(result, summary);
      
      // Enhanced logging for validation
      console.log(`📊 ${postcodeData.postcode} accuracy results:`);
      console.log(`  Airbnb: ${result.airbnb.status} (${result.airbnb.count} listings, ${result.airbnb.precision} precision)`);
      if (result.airbnb.validation_score) {
        console.log(`    Validation Score: ${result.airbnb.validation_score}%`);
      }
      if (result.airbnb.extracted_postcode) {
        console.log(`    Extracted Postcode: ${result.airbnb.extracted_postcode}`);
      }
      console.log(`  SpareRoom: ${result.spareroom.status} (${result.spareroom.count} listings)`);
      console.log(`  Gumtree: ${result.gumtree.status} (${result.gumtree.count} listings)`);
      
      results.push(result);
    } catch (error) {
      console.error(`❌ Error testing postcode ${postcodeData.postcode}:`, error);
      
      const errorResult: TestResult = {
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
      };
      
      // Count errors in summary
      summary.platformStats.airbnb.errors++;
      summary.platformStats.spareroom.errors++;
      summary.platformStats.gumtree.errors++;
      
      results.push(errorResult);
    }
  }

  // Generate recommendations based on results
  summary.recommendations = this.generateAccuracyRecommendations(summary, results);

  console.log(`\n✅ Accuracy testing completed for all ${postcodes.length} postcodes`);
  console.log(`📈 Accuracy Summary:`);
  console.log(`  High Accuracy: ${summary.accuracyStats.highAccuracy}`);
  console.log(`  Medium Accuracy: ${summary.accuracyStats.mediumAccuracy}`);
  console.log(`  Low Accuracy: ${summary.accuracyStats.lowAccuracy}`);

  return { results, summary };
}

function analyzeResultAccuracy(result: TestResult, summary: AccuracyTestSummary): void {
  // Analyze each platform result
  [result.airbnb, result.spareroom, result.gumtree].forEach((platformResult, index) => {
    const platformName = ['airbnb', 'spareroom', 'gumtree'][index] as keyof typeof summary.platformStats;
    
    // Count status types
    if (platformResult.status === 'investigate') {
      summary.platformStats[platformName].investigated++;
    } else if (platformResult.status === 'no_match') {
      summary.platformStats[platformName].noMatch++;
    } else if (platformResult.status === 'error') {
      summary.platformStats[platformName].errors++;
    }
    
    // Count accuracy levels (focus on Airbnb for now as it has enhanced validation)
    if (index === 0 && platformResult.precision) { // Airbnb
      if (platformResult.precision === 'high') {
        summary.accuracyStats.highAccuracy++;
      } else if (platformResult.precision === 'medium') {
        summary.accuracyStats.mediumAccuracy++;
      } else {
        summary.accuracyStats.lowAccuracy++;
      }
    }
    
    // Count postcode validation results
    if (platformResult.extracted_postcode) {
      if (platformResult.confidence === 'High') {
        summary.postcodeValidation.exactMatches++;
      } else if (platformResult.confidence === 'Medium') {
        summary.postcodeValidation.partialMatches++;
      } else {
        summary.postcodeValidation.noMatches++;
      }
    }
  });
}

function generateAccuracyRecommendations(summary: AccuracyTestSummary, results: TestResult[]): string[] {
  const recommendations: string[] = [];
  
  // Accuracy analysis
  const totalAccuracy = summary.accuracyStats.highAccuracy + summary.accuracyStats.mediumAccuracy + summary.accuracyStats.lowAccuracy;
  const highAccuracyRate = totalAccuracy > 0 ? (summary.accuracyStats.highAccuracy / totalAccuracy) * 100 : 0;
  
  if (highAccuracyRate >= 80) {
    recommendations.push(`✅ Excellent accuracy: ${highAccuracyRate.toFixed(1)}% high-accuracy results`);
  } else if (highAccuracyRate >= 60) {
    recommendations.push(`⚠️ Good accuracy: ${highAccuracyRate.toFixed(1)}% high-accuracy results - can be improved`);
  } else {
    recommendations.push(`🔧 Accuracy needs improvement: Only ${highAccuracyRate.toFixed(1)}% high-accuracy results`);
  }
  
  // Platform-specific recommendations
  const airbnbSuccess = summary.platformStats.airbnb.investigated + summary.platformStats.airbnb.noMatch;
  const airbnbTotal = airbnbSuccess + summary.platformStats.airbnb.errors;
  if (airbnbTotal > 0) {
    const airbnbSuccessRate = (airbnbSuccess / airbnbTotal) * 100;
    if (airbnbSuccessRate < 80) {
      recommendations.push(`🏠 Airbnb: ${airbnbSuccessRate.toFixed(1)}% success rate - investigate scraping reliability`);
    }
  }
  
  // Geographic precision recommendations
  const coordinateBasedResults = results.filter(r => r.coordinates);
  if (coordinateBasedResults.length > 0) {
    recommendations.push(`📍 Geographic Precision: ${coordinateBasedResults.length}/${results.length} postcodes have precise coordinates`);
  } else {
    recommendations.push(`📍 Add coordinate lookup for improved geographic accuracy`);
  }
  
  // Postcode validation recommendations
  const totalValidation = summary.postcodeValidation.exactMatches + summary.postcodeValidation.partialMatches + summary.postcodeValidation.noMatches;
  if (totalValidation > 0) {
    const exactMatchRate = (summary.postcodeValidation.exactMatches / totalValidation) * 100;
    if (exactMatchRate < 50) {
      recommendations.push(`🔍 Postcode Validation: Only ${exactMatchRate.toFixed(1)}% exact matches - improve location extraction`);
    }
  }
  
  return recommendations;
}
