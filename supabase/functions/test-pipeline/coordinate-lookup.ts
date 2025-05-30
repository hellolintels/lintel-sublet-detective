
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
        return postcodeData; // Return without boundaries
      }
    })
  );
  
  console.log(`✅ OS Data Hub boundary lookup completed for ${postcodesWithBoundaries.length} postcodes`);
  return postcodesWithBoundaries;
}

export async function lookupPostcodeBoundary(postcode: string): Promise<CoordinateResult> {
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  const apiKey = Deno.env.get('OS_DATA_HUB_API_KEY');
  
  if (!apiKey) {
    throw new Error('OS_DATA_HUB_API_KEY not configured');
  }
  
  // OS Data Hub Features API endpoint for postcode boundaries
  const apiUrl = `https://api.os.uk/features/v1/wfs?service=WFS&request=GetFeature&version=2.0.0&typeNames=Postcodes_PostalPolygon&filter=<ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>POSTCODE</ogc:PropertyName><ogc:Literal>${cleanPostcode}</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>&outputFormat=application/json&srsName=EPSG:4326&key=${apiKey}`;
  
  console.log(`Looking up OS Data Hub boundary for postcode: ${postcode}`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`OS Data Hub API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
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
