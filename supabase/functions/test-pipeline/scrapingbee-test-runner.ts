
import { PostcodeResult, TestResult } from './types.ts';

const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

export interface ScrapingBeeTestResults {
  testResults: TestResult[];
  apiWorking: boolean;
  avgResponseTime: number;
  successfulRequests: number;
  totalRequests: number;
  rateLimitStatus: string;
  errorTypes: string[];
  recommendations: string[];
  overallSuccess: boolean;
}

export async function runScrapingBeeTests(postcodes: PostcodeResult[]): Promise<ScrapingBeeTestResults> {
  console.log(`🚀 Starting ScrapingBee API tests for ${postcodes.length} postcodes`);
  
  if (!SCRAPINGBEE_API_KEY) {
    throw new Error("ScrapingBee API key not configured");
  }

  const testResults: TestResult[] = [];
  const responseTimes: number[] = [];
  const errorTypes: Set<string> = new Set();
  let successfulRequests = 0;
  let totalRequests = 0;

  for (const postcodeData of postcodes) {
    console.log(`\n🎯 Testing postcode: ${postcodeData.postcode}`);
    
    try {
      const result: TestResult = {
        postcode: postcodeData.postcode,
        address: postcodeData.address,
        streetName: postcodeData.streetName || "",
        latitude: postcodeData.latitude,
        longitude: postcodeData.longitude,
        boundary: postcodeData.boundary,
        airbnb: await testScrapingBeeRequest(postcodeData, 'airbnb'),
        spareroom: await testScrapingBeeRequest(postcodeData, 'spareroom'),
        gumtree: await testScrapingBeeRequest(postcodeData, 'gumtree')
      };
      
      // Track response times and success rates
      if (result.airbnb.responseTime) responseTimes.push(result.airbnb.responseTime);
      if (result.spareroom.responseTime) responseTimes.push(result.spareroom.responseTime);
      if (result.gumtree.responseTime) responseTimes.push(result.gumtree.responseTime);
      
      totalRequests += 3;
      if (result.airbnb.status !== "error") successfulRequests++;
      if (result.spareroom.status !== "error") successfulRequests++;
      if (result.gumtree.status !== "error") successfulRequests++;
      
      console.log(`📊 ${postcodeData.postcode} results:`);
      console.log(`  Airbnb: ${result.airbnb.status} (${result.airbnb.count || 0} matches)`);
      console.log(`  SpareRoom: ${result.spareroom.status} (${result.spareroom.count || 0} matches)`);
      console.log(`  Gumtree: ${result.gumtree.status} (${result.gumtree.count || 0} matches)`);
      
      testResults.push(result);
    } catch (error) {
      console.error(`❌ Error testing postcode ${postcodeData.postcode}:`, error);
      errorTypes.add(error.message || 'Unknown error');
      
      testResults.push({
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
    
    // Rate limiting: wait between postcodes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const avgResponseTime = responseTimes.length > 0 ? 
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  const apiWorking = successRate > 50;
  const overallSuccess = apiWorking && errorTypes.size === 0;

  const recommendations = generateRecommendations(successRate, errorTypes, avgResponseTime);

  console.log(`✅ ScrapingBee tests completed for all ${postcodes.length} postcodes`);
  console.log(`📈 API Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`⏱️ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

  return {
    testResults,
    apiWorking,
    avgResponseTime,
    successfulRequests,
    totalRequests,
    rateLimitStatus: successRate > 90 ? "healthy" : successRate > 50 ? "limited" : "critical",
    errorTypes: Array.from(errorTypes),
    recommendations,
    overallSuccess
  };
}

async function testScrapingBeeRequest(postcodeData: PostcodeResult, platform: string) {
  const startTime = Date.now();
  
  try {
    const searchQuery = postcodeData.streetName 
      ? `${postcodeData.streetName}, ${postcodeData.postcode}` 
      : postcodeData.postcode;
    
    const url = buildPlatformUrl(platform, searchQuery);
    const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(url)}&render_js=true`;
    
    console.log(`🔍 Testing ${platform} for ${postcodeData.postcode}`);
    
    const response = await fetch(scrapingBeeUrl);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`ScrapingBee API error: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    const result = analyzeScrapingResult(html, postcodeData, platform, url);
    
    return {
      ...result,
      responseTime,
      url
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ ${platform} scraping error for ${postcodeData.postcode}:`, error);
    
    return {
      status: "error",
      count: 0,
      message: error.message,
      responseTime
    };
  }
}

function buildPlatformUrl(platform: string, searchQuery: string): string {
  switch (platform) {
    case 'airbnb':
      return `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;
    case 'spareroom':
      return `https://www.spareroom.co.uk/flatshare/?search=${encodeURIComponent(searchQuery)}`;
    case 'gumtree':
      return `https://www.gumtree.com/search?search_location=${encodeURIComponent(searchQuery)}`;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

function analyzeScrapingResult(html: string, postcodeData: PostcodeResult, platform: string, url: string) {
  const { postcode, streetName } = postcodeData;
  const postcodeRegex = new RegExp(`\\b${postcode.replace(/\s+/g, '\\s*')}\\b`, 'i');
  
  // Platform-specific listing detection
  let hasListings = false;
  let listingCount = 0;
  
  switch (platform) {
    case 'airbnb':
      hasListings = html.includes('data-testid="card-container"') || html.includes('"listings"');
      listingCount = (html.match(/data-testid="card-container"/g) || []).length;
      break;
    case 'spareroom':
      hasListings = html.includes('listing-result') || html.includes('listing-');
      listingCount = (html.match(/listing-result/g) || []).length;
      break;
    case 'gumtree':
      hasListings = html.includes('listing-') || html.includes('natural');
      listingCount = (html.match(/listing-/g) || []).length;
      break;
  }
  
  // Check for postcode matches
  const hasPostcodeMatch = postcodeRegex.test(html);
  const hasStreetMatch = streetName ? html.toLowerCase().includes(streetName.toLowerCase()) : false;
  
  if (hasListings && (hasPostcodeMatch || hasStreetMatch)) {
    const confidenceLevel = hasStreetMatch ? "High" : hasPostcodeMatch ? "Medium" : "Low";
    return {
      status: "investigate",
      count: Math.max(listingCount, 1),
      confidence: confidenceLevel,
      message: `Found ${listingCount} listings with ${confidenceLevel.toLowerCase()} confidence`
    };
  } else if (hasListings) {
    return {
      status: "investigate",
      count: listingCount,
      confidence: "Low",
      message: `Found ${listingCount} listings but low location confidence`
    };
  } else {
    return {
      status: "no_match",
      count: 0,
      message: "No listings found in search area"
    };
  }
}

function generateRecommendations(successRate: number, errorTypes: Set<string>, avgResponseTime: number): string[] {
  const recommendations: string[] = [];
  
  if (successRate < 50) {
    recommendations.push("ScrapingBee API success rate is low - check API key and account status");
  }
  
  if (errorTypes.has("429") || errorTypes.has("Too Many Requests")) {
    recommendations.push("Rate limiting detected - implement request throttling");
  }
  
  if (avgResponseTime > 10000) {
    recommendations.push("Response times are slow - consider reducing concurrent requests");
  }
  
  if (errorTypes.size > 0) {
    recommendations.push("API errors detected - implement retry logic with exponential backoff");
  }
  
  if (successRate > 80) {
    recommendations.push("ScrapingBee API performing well - ready for production deployment");
  }
  
  return recommendations;
}
