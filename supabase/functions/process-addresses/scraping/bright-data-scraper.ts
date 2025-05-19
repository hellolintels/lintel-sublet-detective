
/**
 * Bright Data scraping module for Lintels address matching
 */

export async function scrapePostcodes(postcodes: string[]) {
  console.log(`Starting scraping for ${postcodes.length} postcodes`);

  // Get Bright Data API key from environment variables
  const apiKey = Deno.env.get("BRIGHT_DATA_API_KEY");
  if (!apiKey) {
    console.error("BRIGHT_DATA_API_KEY environment variable not set");
    throw new Error("Bright Data API key not configured");
  }
  
  const authHeader = `Bearer ${apiKey}`;

  const results = [];
  const batchSize = 5; // Process postcodes in smaller batches to avoid rate limits

  for (let i = 0; i < postcodes.length; i += batchSize) {
    const batch = postcodes.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}, postcodes: ${batch.join(', ')}`);

    const batchPromises = batch.map((postcode) => scrapePostcode(postcode, authHeader));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < postcodes.length) {
      console.log("Waiting 2 seconds before processing next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`Scraping completed for all ${postcodes.length} postcodes`);
  return results;
}

async function scrapePostcode(postcode: string, authHeader: string) {
  console.log(`Scraping postcode: ${postcode}`);
  const formattedPostcode = postcode.replace(/\s+/g, '-');

  try {
    // Make parallel requests to each platform
    const [airbnbResult, spareroomResult, gumtreeResult] = await Promise.all([
      scrapeAirbnb(formattedPostcode, authHeader),
      scrapeSpareRoom(formattedPostcode, authHeader),
      scrapeGumtree(formattedPostcode, authHeader)
    ]);

    return {
      postcode,
      airbnb: airbnbResult,
      spareroom: spareroomResult,
      gumtree: gumtreeResult
    };
  } catch (error) {
    console.error(`Error scraping postcode ${postcode}:`, error);
    return {
      postcode,
      airbnb: { status: "error", message: error.message },
      spareroom: { status: "error", message: error.message },
      gumtree: { status: "error", message: error.message }
    };
  }
}

async function scrapeAirbnb(postcode: string, authHeader: string) {
  console.log(`Checking Airbnb for postcode: ${postcode}`);
  const url = `https://www.airbnb.com/s/${postcode}/homes`;
  
  try {
    const response = await makeProxyRequest(url, authHeader);
    if (!response.ok) {
      throw new Error(`Airbnb request failed with status ${response.status}`);
    }
    
    // For now in development, we'll simulate random results
    // In production, this would parse the actual response
    const hasListings = Math.random() > 0.6;
    return hasListings
      ? { status: "investigate", url, count: Math.floor(Math.random() * 10) + 1 }
      : { status: "no match", url, count: 0 };
  } catch (error) {
    console.error(`Error scraping Airbnb for ${postcode}:`, error);
    return { status: "error", message: error.message, url };
  }
}

async function scrapeSpareRoom(postcode: string, authHeader: string) {
  console.log(`Checking SpareRoom for postcode: ${postcode}`);
  const url = `https://www.spareroom.co.uk/flatshare/search.pl?search=${postcode}`;
  
  try {
    const response = await makeProxyRequest(url, authHeader);
    if (!response.ok) {
      throw new Error(`SpareRoom request failed with status ${response.status}`);
    }
    
    // Simulated results for development
    const hasListings = Math.random() > 0.5;
    return hasListings
      ? { status: "investigate", url, count: Math.floor(Math.random() * 15) + 1 }
      : { status: "no match", url, count: 0 };
  } catch (error) {
    console.error(`Error scraping SpareRoom for ${postcode}:`, error);
    return { status: "error", message: error.message, url };
  }
}

async function scrapeGumtree(postcode: string, authHeader: string) {
  console.log(`Checking Gumtree for postcode: ${postcode}`);
  const url = `https://www.gumtree.com/property-to-rent/uk/${postcode}`;
  
  try {
    const response = await makeProxyRequest(url, authHeader);
    if (!response.ok) {
      throw new Error(`Gumtree request failed with status ${response.status}`);
    }
    
    // Simulated results for development
    const hasListings = Math.random() > 0.4;
    return hasListings
      ? { status: "investigate", url, count: Math.floor(Math.random() * 20) + 1 }
      : { status: "no match", url, count: 0 };
  } catch (error) {
    console.error(`Error scraping Gumtree for ${postcode}:`, error);
    return { status: "error", message: error.message, url };
  }
}

async function makeProxyRequest(url: string, authHeader: string) {
  try {
    // In production, this would use actual Bright Data APIs
    // For now, simulate successful responses
    return {
      ok: true,
      status: 200,
      text: async () => "<html><body>Simulated response</body></html>"
    };
  } catch (error) {
    console.error(`Error making proxy request to ${url}:`, error);
    throw error;
  }
}
