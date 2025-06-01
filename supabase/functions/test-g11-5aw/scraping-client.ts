
export interface ScrapingResult {
  strategy: number;
  url: string;
  success: boolean;
  responseTime: number;
  htmlLength?: number;
  htmlPreview?: string;
  postcodeDetection?: any;
  antiBot?: any;
  listingsFound?: any;
  message?: string;
  error?: string;
  details?: string;
}

export async function makeScrapingRequest(
  searchUrl: string, 
  strategyIndex: number, 
  apiKey: string
): Promise<ScrapingResult> {
  console.log(`\n🚀 Strategy ${strategyIndex + 1}: ${searchUrl}`);
  
  // Enhanced ScrapingBee parameters based on manus.ai recommendations
  const params = new URLSearchParams({
    api_key: apiKey,
    url: searchUrl,
    render_js: 'true',
    wait: '5000',
    premium_proxy: 'true',
    country_code: 'gb',
    forward_headers: 'true'
  });
  
  const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;
  
  console.log(`📊 ScrapingBee URL parameters:`, {
    render_js: true,
    wait: 5000,
    premium_proxy: true,
    country_code: 'gb',
    forward_headers: true
  });
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(scrapingBeeUrl);
    const responseTime = Date.now() - startTime;
    
    console.log(`📊 Strategy ${strategyIndex + 1} Response: ${response.status} ${response.statusText} (${responseTime}ms)`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Strategy ${strategyIndex + 1} ScrapingBee API error: ${errorText}`);
      
      return {
        strategy: strategyIndex + 1,
        url: searchUrl,
        success: false,
        error: `ScrapingBee API error: ${response.status}`,
        details: errorText,
        responseTime
      };
    }
    
    const html = await response.text();
    console.log(`📄 Strategy ${strategyIndex + 1} HTML received: ${html.length} characters`);
    console.log(`📝 Strategy ${strategyIndex + 1} HTML preview (first 2000 chars): ${html.substring(0, 2000)}`);
    
    return {
      strategy: strategyIndex + 1,
      url: searchUrl,
      success: true,
      responseTime,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 2000)
    };
    
  } catch (error) {
    console.error(`❌ Strategy ${strategyIndex + 1} fetch error:`, error);
    return {
      strategy: strategyIndex + 1,
      url: searchUrl,
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}
