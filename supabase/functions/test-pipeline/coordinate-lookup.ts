
import { PostcodeResult, CoordinateResult, PostcodeBoundary, OSDataHubResult } from './types.ts';

export async function addCoordinatesToPostcodes(postcodes: PostcodeResult[]): Promise<PostcodeResult[]> {
  console.log("🗺️ Looking up OS Places API coordinates for precise address locations...");
  
  const postcodesWithCoordinates = await Promise.all(
    postcodes.map(async (postcodeData) => {
      try {
        // Try OS Places API first for building-level precision
        const placesData = await lookupAddressWithPlacesAPI(postcodeData);
        console.log(`✅ OS Places API found precise coordinates for ${postcodeData.postcode}: ${placesData.latitude}, ${placesData.longitude}`);
        return {
          ...postcodeData,
          latitude: placesData.latitude,
          longitude: placesData.longitude
        };
      } catch (error) {
        console.warn(`OS Places API failed for ${postcodeData.postcode}:`, error.message);
        
        // Fallback to postcodes.io for basic postcode coordinates
        try {
          const fallbackData = await lookupPostcodeCoordinates(postcodeData.postcode);
          console.log(`✅ Fallback coordinates found for ${postcodeData.postcode}: ${fallbackData.latitude}, ${fallbackData.longitude}`);
          return {
            ...postcodeData,
            latitude: fallbackData.latitude,
            longitude: fallbackData.longitude
          };
        } catch (fallbackError) {
          console.warn(`Fallback coordinate lookup also failed for ${postcodeData.postcode}:`, fallbackError.message);
          return postcodeData; // Return without coordinates
        }
      }
    })
  );
  
  console.log(`✅ Coordinate lookup completed for ${postcodesWithCoordinates.length} postcodes`);
  return postcodesWithCoordinates;
}

export async function lookupAddressWithPlacesAPI(postcodeData: PostcodeResult): Promise<{ latitude: number; longitude: number }> {
  const apiKey = Deno.env.get('OS_DATA_HUB_PLACES_API_KEY');
  
  if (!apiKey) {
    throw new Error('OS_DATA_HUB_PLACES_API_KEY not configured');
  }
  
  // Use the full address for building-level precision
  const query = postcodeData.address || (postcodeData.streetName ? `${postcodeData.streetName}, ${postcodeData.postcode}` : postcodeData.postcode);
  
  // OS Places API endpoint for text search
  const baseUrl = 'https://api.os.uk/search/places/v1/find';
  const apiUrl = `${baseUrl}?query=${encodeURIComponent(query)}&key=${apiKey}&maxresults=1&minmatch=0.6`;
  
  console.log(`Looking up address with OS Places API: ${query}`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OS Places API error (${response.status}):`, errorText);
      throw new Error(`OS Places API request failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    console.log(`OS Places API response for ${postcodeData.postcode}:`, JSON.stringify(data, null, 2).substring(0, 500));
    
    if (!data.results || data.results.length === 0) {
      throw new Error(`No address data found for: ${query}`);
    }
    
    const result = data.results[0];
    const dpa = result.DPA || result.LPI;
    
    if (!dpa || !dpa.LNG || !dpa.LAT) {
      throw new Error(`Invalid coordinate data for address: ${query}`);
    }
    
    return {
      latitude: parseFloat(dpa.LAT),
      longitude: parseFloat(dpa.LNG)
    };
    
  } catch (error) {
    console.error(`Error looking up address with OS Places API for ${query}:`, error);
    throw error;
  }
}

// Fallback function using postcodes.io for basic coordinates
async function lookupPostcodeCoordinates(postcode: string): Promise<{ latitude: number; longitude: number }> {
  const cleanPostcode = postcode.replace(/\s+/g, '');
  const apiUrl = `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`;
  
  console.log(`Fallback coordinate lookup for ${postcode} using postcodes.io`);
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`Postcodes.io API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.result || !data.result.latitude || !data.result.longitude) {
    throw new Error(`No coordinate data found for postcode: ${postcode}`);
  }
  
  return {
    latitude: data.result.latitude,
    longitude: data.result.longitude
  };
}
