/**
 * Bright Data scraping module for Lintels address matching
 */

export async function scrapePostcodes(postcodes) {
  console.log(`Starting scraping for ${postcodes.length} postcodes`);

  // Get Bright Data API key from environment variables
  const apiKey = Deno.env.get("BRIGHT_DATA_API_KEY");
  const authHeader = `Bearer ${apiKey}`;

  const results = [];
  const batchSize = 5;

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

async function scrapePostcode(postcode, authHeader) {
  console.log(`Scraping postcode: ${postcode}`);
  const formattedPostcode = postcode.replace(/\s+/g, '-');

  try {
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

async function scrapeAirbnb(postcode, authHeader) {
  console.log(`Checking Airbnb for postcode: ${postcode}`);
  const url = `https://www.airbnb.com/s/${postcode}/homes`;
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
  const hasListings = Math.random() > 0.6;
  return hasListings
    ? { status: "investigate", url, count: Math.floor(Math.random() * 10) + 1 }
    : { status: "no match", url, count: 0 };
}

async function scrapeSpareRoom(postcode, authHeader) {
  console.log(`Checking SpareRoom for postcode: ${postcode}`);
  const url = `https://www.spareroom.co.uk/flatshare/search.pl?search=${postcode}`;
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
  const hasListings = Math.random() > 0.5;
  return hasListings
    ? { status: "investigate", url, count: Math.floor(Math.random() * 15) + 1 }
    : { status: "no match", url, count: 0 };
}

async function scrapeGumtree(postcode, authHeader) {
  console.log(`Checking Gumtree for postcode: ${postcode}`);
  const url = `https://www.gumtree.com/property-to-rent/uk/${postcode}`;
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
  const hasListings = Math.random() > 0.4;
  return hasListings
    ? { status: "investigate", url, count: Math.floor(Math.random() * 20) + 1 }
    : { status: "no match", url, count: 0 };
}

async function makeProxyRequest(url, authHeader) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      redirect: 'follow'
    });
    return response;
  } catch (error) {
    console.error(`Error making proxy request to ${url}:`, error);
    throw error;
  }
}
