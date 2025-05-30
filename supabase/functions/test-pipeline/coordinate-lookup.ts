
import { PostcodeResult, CoordinateResult, PostcodeBoundary, OSDataHubResult } from './types.ts';

export async function addCoordinatesToPostcodes(postcodes: PostcodeResult[]): Promise<PostcodeResult[]> {
  console.log("🗺️ Looking up OS Data Hub boundaries for postcodes...");
  
  const postcodesWithBoundaries = await Promise.all(
    postcodes.map(async (postcodeData) => {
      try {
        const osData = await lookupPostcodeBoundary(postcodeData.postcode);
        return {
          ...postcodeData,
          latitude: osData.latitude,
          longitude: osData.longitude,
          boundary: osData.boundary
        };
      } catch (error) {
        console.warn(`Could not get OS Data Hub boundary for ${postcodeData.postcode}:`, error.message);
        
        // Fallback to postcodes.io for coordinates only
        try {
          const fallbackData = await lookupPostcodeCoordinates(postcodeData.postcode);
          console.log(`✅ Fallback coordinates found for ${postcodeData.postcode}: ${fallbackData.latitude}, ${fallbackData.longitude}`);
          return {
            ...postcodeData,
            latitude: fallbackData.latitude,
            longitude: fallbackData.longitude
            // No boundary data in fallback
          };
        } catch (fallbackError) {
          console.warn(`Fallback coordinate lookup also failed for ${postcodeData.postcode}:`, fallbackError.message);
          return postcodeData; // Return without coordinates or boundaries
        }
      }
    })
  );
  
  console.log(`✅ Coordinate lookup completed for ${postcodesWithBoundaries.length} postcodes`);
  return postcodesWithBoundaries;
}

export async function lookupPostcodeBoundary(postcode: string): Promise<CoordinateResult> {
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  const apiKey = Deno.env.get('OS_DATA_HUB_API_KEY');
  
  if (!apiKey) {
    throw new Error('OS_DATA_HUB_API_KEY not configured');
  }
  
  // Corrected OS Data Hub WFS endpoint and type name
  const baseUrl = 'https://api.os.uk/features/v1/wfs';
  
  // Fixed filter XML with proper namespaces and property name
  const filter = `<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
    <ogc:PropertyIsEqualTo>
      <ogc:PropertyName>POSTCODE</ogc:PropertyName>
      <ogc:Literal>${cleanPostcode}</ogc:Literal>
    </ogc:PropertyIsEqualTo>
  </ogc:Filter>`;
  
  // Properly encode the filter parameter
  const encodedFilter = encodeURIComponent(filter);
  
  // Corrected API URL with proper type name and parameters
  const apiUrl = `${baseUrl}?service=WFS&request=GetFeature&version=2.0.0&typeNames=osfeatures:postcode_polygons&filter=${encodedFilter}&outputFormat=application/json&srsName=EPSG:4326&key=${apiKey}`;
  
  console.log(`Looking up OS Data Hub boundary for postcode: ${postcode}`);
  console.log(`API URL: ${apiUrl.substring(0, 150)}...`); // Log truncated URL for debugging
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OS Data Hub API error (${response.status}):`, errorText);
      throw new Error(`OS Data Hub API request failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    console.log(`OS Data Hub response for ${postcode}:`, JSON.stringify(data, null, 2).substring(0, 500));
    
    if (!data.features || data.features.length === 0) {
      throw new Error(`No boundary data found for postcode: ${postcode}`);
    }
    
    const feature = data.features[0];
    const geometry = feature.geometry;
    
    if (!geometry || !geometry.coordinates) {
      throw new Error(`Invalid geometry data for postcode: ${postcode}`);
    }
    
    // Extract bounding box from polygon coordinates
    const boundary = extractBoundingBox(geometry.coordinates);
    
    // Calculate center point from boundary
    const centerLat = (boundary.southwest.lat + boundary.northeast.lat) / 2;
    const centerLng = (boundary.southwest.lng + boundary.northeast.lng) / 2;
    
    console.log(`✅ Found OS boundary for ${postcode}: SW(${boundary.southwest.lat}, ${boundary.southwest.lng}) NE(${boundary.northeast.lat}, ${boundary.northeast.lng})`);
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      postcode: cleanPostcode,
      boundary: boundary
    };
    
  } catch (error) {
    console.error(`Error looking up OS Data Hub boundary for ${postcode}:`, error);
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

function extractBoundingBox(coordinates: number[][][]): PostcodeBoundary {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  
  // Handle polygon coordinates (could be MultiPolygon or Polygon)
  const coords = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
  
  coords.forEach((ring: number[][]) => {
    ring.forEach(([lng, lat]: number[]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  });
  
  return {
    southwest: { lat: minLat, lng: minLng },
    northeast: { lat: maxLat, lng: maxLng }
  };
}
