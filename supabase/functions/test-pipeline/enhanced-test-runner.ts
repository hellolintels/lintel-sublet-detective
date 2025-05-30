
import { PostcodeResult, TestResult } from './types.ts';
import { testScrapeAirbnb } from './airbnb-scraper.ts';
import { BrightDataConnectionManager, ConnectionTestResult } from './websocket-connection-manager.ts';

export interface EnhancedTestResults {
  connectionDiagnostics: ConnectionTestResult[];
  workingEndpoint: string | null;
  connectionSummary: string;
  testResults: TestResult[];
  overallSuccess: boolean;
  recommendations: string[];
}

export async function runEnhancedTests(postcodes: PostcodeResult[]): Promise<EnhancedTestResults> {
  console.log(`🧪 Starting enhanced test pipeline for ${postcodes.length} postcodes`);
  
  // Phase 1: Test WebSocket connections
  console.log(`\n🔌 Phase 1: WebSocket Connection Testing`);
  const connectionManager = new BrightDataConnectionManager();
  const connectionDiagnostics = await connectionManager.testAllConnections();
  const workingEndpoint = await connectionManager.getWorkingConnection();
  const connectionSummary = connectionManager.getConnectionSummary(connectionDiagnostics);
  
  console.log(connectionSummary);
  
  if (!workingEndpoint) {
    console.error(`❌ No working WebSocket endpoint found - cannot proceed with scraping tests`);
    return {
      connectionDiagnostics,
      workingEndpoint: null,
      connectionSummary,
      testResults: [],
      overallSuccess: false,
      recommendations: [
        "Check Bright Data credentials and endpoint configuration",
        "Verify network connectivity and firewall settings",
        "Contact Bright Data support if all credentials are correct"
      ]
    };
  }
  
  // Phase 2: Test Airbnb scraping
  console.log(`\n🏠 Phase 2: Airbnb Scraping Tests`);
  const testResults: TestResult[] = [];
  let successCount = 0;
  
  for (let i = 0; i < postcodes.length; i++) {
    const postcodeData = postcodes[i];
    console.log(`\n📍 Testing ${i + 1}/${postcodes.length}: ${postcodeData.postcode}`);
    
    try {
      const airbnbResult = await testScrapeAirbnb(postcodeData);
      
      const testResult: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || '',
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: airbnbResult,
        spareroom: { status: "skipped", count: 0, search_method: "not-tested", precision: "none" },
        gumtree: { status: "skipped", count: 0, search_method: "not-tested", precision: "none" }
      };
      
      testResults.push(testResult);
      
      if (airbnbResult.status === "investigate" || airbnbResult.count > 0) {
        successCount++;
        console.log(`✅ ${postcodeData.postcode}: ${airbnbResult.count} matches found`);
      } else {
        console.log(`⚠️ ${postcodeData.postcode}: ${airbnbResult.status} - ${airbnbResult.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${postcodeData.postcode}:`, error);
      
      const testResult: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || '',
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: {
          status: "error",
          count: 0,
          search_method: "error",
          precision: "none",
          message: `Test error: ${error.message}`
        },
        spareroom: { status: "skipped", count: 0, search_method: "not-tested", precision: "none" },
        gumtree: { status: "skipped", count: 0, search_method: "not-tested", precision: "none" }
      };
      
      testResults.push(testResult);
    }
  }
  
  // Phase 3: Generate recommendations
  console.log(`\n📊 Phase 3: Analysis and Recommendations`);
  const recommendations = generateRecommendations(connectionDiagnostics, testResults, successCount, postcodes.length);
  
  const overallSuccess = workingEndpoint !== null && successCount > postcodes.length * 0.5;
  
  console.log(`\n🎯 Test Summary:`);
  console.log(`   WebSocket: ${workingEndpoint ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Airbnb Success Rate: ${successCount}/${postcodes.length} (${(successCount/postcodes.length*100).toFixed(1)}%)`);
  console.log(`   Overall Success: ${overallSuccess ? '✅' : '❌'}`);
  
  return {
    connectionDiagnostics,
    workingEndpoint,
    connectionSummary,
    testResults,
    overallSuccess,
    recommendations
  };
}

function generateRecommendations(
  connectionDiagnostics: ConnectionTestResult[],
  testResults: TestResult[],
  successCount: number,
  totalTests: number
): string[] {
  const recommendations: string[] = [];
  
  // WebSocket recommendations
  const workingConnections = connectionDiagnostics.filter(r => r.success);
  if (workingConnections.length === 0) {
    recommendations.push("🔌 WebSocket Connection: No working endpoints found. Check Bright Data credentials and network connectivity.");
  } else if (workingConnections.length === 1) {
    recommendations.push(`🔌 WebSocket Connection: Only port ${workingConnections[0].port} is working. Monitor for stability.`);
  } else {
    const fastestPort = workingConnections.sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))[0];
    recommendations.push(`🔌 WebSocket Connection: Multiple ports working. Port ${fastestPort.port} is fastest (${fastestPort.responseTime}ms).`);
  }
  
  // Scraping performance recommendations
  const successRate = (successCount / totalTests) * 100;
  if (successRate < 30) {
    recommendations.push("🏠 Airbnb Scraping: Low success rate. Check CSS selectors and search strategies.");
  } else if (successRate < 70) {
    recommendations.push("🏠 Airbnb Scraping: Moderate success rate. Fine-tune search precision and postcode validation.");
  } else {
    recommendations.push("🏠 Airbnb Scraping: Good success rate. Consider expanding to other platforms.");
  }
  
  // Strategy effectiveness analysis
  const strategyPerformance = analyzeStrategyPerformance(testResults);
  if (strategyPerformance.bestStrategy) {
    recommendations.push(`🎯 Best Strategy: "${strategyPerformance.bestStrategy}" with ${strategyPerformance.bestSuccessRate}% success rate.`);
  }
  
  // Error pattern analysis
  const commonErrors = analyzeCommonErrors(testResults);
  if (commonErrors.length > 0) {
    recommendations.push(`⚠️ Common Issues: ${commonErrors.slice(0, 2).join(', ')}`);
  }
  
  // Next steps
  if (successRate > 70) {
    recommendations.push("🚀 Next Steps: Implement SpareRoom and Gumtree scrapers, optimize performance.");
  } else if (successRate > 30) {
    recommendations.push("🔧 Next Steps: Improve Airbnb reliability before expanding to other platforms.");
  } else {
    recommendations.push("🛠️ Next Steps: Fix fundamental WebSocket and scraping issues before proceeding.");
  }
  
  return recommendations;
}

function analyzeStrategyPerformance(testResults: TestResult[]): {
  bestStrategy: string | null;
  bestSuccessRate: number;
} {
  const strategyStats: Record<string, { success: number; total: number }> = {};
  
  testResults.forEach(result => {
    const strategy = result.airbnb.search_method || 'unknown';
    if (!strategyStats[strategy]) {
      strategyStats[strategy] = { success: 0, total: 0 };
    }
    
    strategyStats[strategy].total++;
    if (result.airbnb.status === 'investigate' || result.airbnb.count > 0) {
      strategyStats[strategy].success++;
    }
  });
  
  let bestStrategy: string | null = null;
  let bestSuccessRate = 0;
  
  Object.entries(strategyStats).forEach(([strategy, stats]) => {
    const successRate = (stats.success / stats.total) * 100;
    if (successRate > bestSuccessRate && stats.total >= 2) { // Require at least 2 samples
      bestStrategy = strategy;
      bestSuccessRate = successRate;
    }
  });
  
  return { bestStrategy, bestSuccessRate: Math.round(bestSuccessRate) };
}

function analyzeCommonErrors(testResults: TestResult[]): string[] {
  const errorCounts: Record<string, number> = {};
  
  testResults.forEach(result => {
    if (result.airbnb.status === 'error' || result.airbnb.status === 'no_match') {
      const error = result.airbnb.message || result.airbnb.status;
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    }
  });
  
  return Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([error, count]) => `${error} (${count}x)`);
}
