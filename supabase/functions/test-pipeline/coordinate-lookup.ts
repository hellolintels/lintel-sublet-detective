
import { PostcodeResult, CoordinateResult } from './types.ts';

export async function addCoordinatesToPostcodes(postcodes: PostcodeResult[]): Promise<PostcodeResult[]> {
  console.log("🗺️ Looking up coordinates for postcodes...");
  
  const postcodesWithCoords = await Promise.all(
    postcodes.map(async (postcodeData) => {
      try {
        const coords = await lookupPostcodeCoordinates(postcodeData.postcode);
        return {
          ...postcodeData,
          latitude: coords.latitude,
          longitude: coords.longitude
        };
      } catch (error) {
        console.warn(`Could not get coordinates for ${postcodeData.postcode}:`, error.message);
        return postcodeData; // Return without coordinates
      }
    })
  );
  
  console.log(`✅ Coordinate lookup completed for ${postcodesWithCoords.length} postcodes`);
  return postcodesWithCoords;
}

export async function lookupPostcodeCoordinates(postcode: string): Promise<CoordinateResult> {
  // Using postcodes.io - a free UK postcode API
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  const apiUrl = `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`;
  
  console.log(`Looking up coordinates for postcode: ${postcode}`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 200 && data.result) {
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
        postcode: data.result.postcode
      };
    } else {
      throw new Error(`Invalid response: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`Error looking up coordinates for ${postcode}:`, error);
    throw error;
  }
}
