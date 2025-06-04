
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function downloadFileContent(bucket: string, path: string): Promise<string> {
  try {
    console.log(`Downloading file from ${bucket}/${path}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Storage configuration error: Missing credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(path);
      
    if (error) {
      console.error("File download failed:", error);
      throw new Error("Storage error: " + error.message);
    }
    
    if (!data) {
      throw new Error("No file data returned");
    }
    
    const content = await data.text();
    console.log("File downloaded successfully, size:", content.length);
    return content;
  } catch (error) {
    console.error("File download error:", error);
    throw error;
  }
}

export function extractPostcodes(content: string): Array<{postcode: string, address: string}> {
  try {
    console.log("Extracting postcodes from file content");
    
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
      console.warn("File contains no data rows");
      return [];
    }
    
    const dataRows = lines.slice(1);
    const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
    
    const postcodes: Array<{postcode: string, address: string}> = [];
    const uniquePostcodes = new Set<string>();
    
    dataRows.forEach(line => {
      const parts = line.split(',');
      
      for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(postcodeRegex);
        
        if (match) {
          const postcode = match[0].toUpperCase().replace(/\s+/g, ' ');
          
          if (!uniquePostcodes.has(postcode)) {
            uniquePostcodes.add(postcode);
            postcodes.push({
              postcode,
              address: line.trim()
            });
          }
          
          break;
        }
      }
    });
    
    console.log(`Found ${postcodes.length} unique postcodes`);
    return postcodes;
  } catch (error) {
    console.error("Error extracting postcodes:", error);
    return [];
  }
}
