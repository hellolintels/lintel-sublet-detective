
/**
 * Count rows in a CSV-like string - with improved handling of file data
 * @param fileData String containing the file data
 * @returns Number of rows in the file
 */
export function countAddressRows(fileData: string | null | undefined): number {
  console.log("countAddressRows called with fileData type:", typeof fileData);
  if (!fileData) {
    console.log("No file data provided");
    return 0;
  }
  
  let dataString: string;
  
  // First, try to safely decode the file data if it's base64 encoded
  try {
    console.log("Processing file data, first 20 chars:", typeof fileData === 'string' ? fileData.substring(0, 20) : 'NOT A STRING');
    console.log("File data length:", typeof fileData === 'string' ? fileData.length : 'NOT A STRING');
    
    // Check if the data actually looks like base64 before trying to decode it
    const base64Regex = /^[A-Za-z0-9+/=]*$/;
    if (typeof fileData === 'string' && base64Regex.test(fileData)) {
      try {
        console.log("File data appears to be base64, attempting to decode");
        dataString = atob(fileData);
        console.log("Successfully decoded base64 data, length:", dataString.length);
      } catch (e) {
        console.error("Error in base64 decoding:", e);
        console.log("Falling back to using raw data");
        dataString = fileData; // Fall back to using the raw data
      }
    } else {
      console.log("File data doesn't appear to be base64 encoded or isn't a string, using as is");
      dataString = typeof fileData === 'string' ? fileData : JSON.stringify(fileData);
    }
  } catch (e) {
    console.error("Exception during base64 check/decode:", e);
    console.log("Falling back to string conversion as last resort");
    dataString = String(fileData); // Convert to string as a last resort
  }
  
  // More robust line counting
  try {
    console.log("Splitting data into lines");
    const lines = dataString.split('\n');
    console.log(`File contains ${lines.length} lines`);
    
    // Log a few sample lines for debugging
    if (lines.length > 0) console.log("First line:", lines[0]);
    if (lines.length > 1) console.log("Second line:", lines[1]);
    
    // Count non-empty lines
    const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
    console.log(`Found ${nonEmptyLines} non-empty lines`);
    
    // If we have at least one non-empty line, assume it's the header and subtract 1
    const dataRows = nonEmptyLines > 0 ? nonEmptyLines - 1 : 0;
    console.log(`Counted ${dataRows} data rows (excluding header)`);
    return dataRows;
  } catch (error) {
    console.error("Error counting lines:", error);
    return 0; // Return 0 as a safe default
  }
}

/**
 * Extract file data from a contact record for attachment
 * Enhanced version with better error handling and base64 validation
 * @param contact The contact record containing file data
 * @returns String with the file content ready for attachment, or null
 */
export function extractFileDataForAttachment(contact: any): string | null {
  if (!contact || !contact.file_data) {
    console.log("No contact or file data available for extraction");
    return null;
  }
  
  try {
    console.log("Extracting file data for attachment from contact:", contact.id);
    console.log("File data type:", typeof contact.file_data);
    
    // Handle different types of file data
    let fileContent: string | null = null;
    
    if (typeof contact.file_data === 'string') {
      console.log("File data is string type, length:", contact.file_data.length);
      
      // Check if the string is already base64 encoded
      const base64Regex = /^[A-Za-z0-9+/=]*$/;
      if (base64Regex.test(contact.file_data)) {
        console.log("String appears to be already base64 encoded");
        fileContent = contact.file_data;
        
        // Double-check validity by trying to decode a small portion
        try {
          const testDecode = atob(contact.file_data.substring(0, 100));
          console.log("Base64 validity check: Successfully decoded test portion");
        } catch (e) {
          console.warn("Base64 validity check failed, string might not be valid base64:", e);
          
          // Try to re-encode it properly
          try {
            fileContent = btoa(unescape(encodeURIComponent(contact.file_data)));
            console.log("Re-encoded as base64, new length:", fileContent.length);
          } catch (encodeError) {
            console.error("Failed to re-encode as base64:", encodeError);
            // Continue anyway, it might work
          }
        }
      } else {
        // If it's not base64 encoded, encode it
        console.log("Converting string to base64");
        try {
          // We need to handle Unicode characters correctly
          fileContent = btoa(unescape(encodeURIComponent(contact.file_data)));
          console.log("Successfully encoded to base64, length:", fileContent.length);
        } catch (e) {
          console.error("Error during base64 encoding:", e);
          // As a last resort, try a different encoding approach
          try {
            console.log("Trying alternative encoding approach");
            const encoder = new TextEncoder();
            const bytes = encoder.encode(contact.file_data);
            fileContent = btoa(String.fromCharCode(...new Uint8Array(bytes)));
            console.log("Alternative encoding successful, length:", fileContent.length);
          } catch (innerError) {
            console.error("All encoding approaches failed:", innerError);
            return null;
          }
        }
      }
    } else if (contact.file_data instanceof Uint8Array) {
      // Convert Uint8Array to base64 string
      console.log("Converting Uint8Array to base64");
      fileContent = btoa(String.fromCharCode(...contact.file_data));
      console.log("Converted Uint8Array to base64, length:", fileContent.length);
    } else {
      // Handle PostgreSQL bytea type which might come as an object
      console.log("File data appears to be an object");
      
      if (typeof contact.file_data.toString === 'function') {
        try {
          // Try to use toString method if available
          fileContent = contact.file_data.toString('base64');
          console.log("Used toString('base64'), length:", fileContent ? fileContent.length : 0);
        } catch (e) {
          console.error("Error using toString('base64'):", e);
        }
      }
      
      // As a last resort, stringify the object and encode it
      if (!fileContent) {
        const jsonString = JSON.stringify(contact.file_data);
        console.log("Used JSON.stringify as fallback, length:", jsonString.length);
        fileContent = btoa(unescape(encodeURIComponent(jsonString)));
      }
    }
    
    if (!fileContent) {
      console.error("Failed to extract file data after all attempts");
      return null;
    }
    
    // Double check: Ensure the content is properly base64 encoded
    try {
      // Try to decode a small part to verify it's valid base64
      atob(fileContent.substring(0, 10));
    } catch (e) {
      console.error("Final base64 validation failed:", e);
      // Last ditch effort - try to re-encode
      try {
        fileContent = btoa(unescape(encodeURIComponent(fileContent)));
      } catch (finalError) {
        console.error("Final encoding attempt failed:", finalError);
        return null;
      }
    }
    
    console.log("Final file content length:", fileContent.length);
    console.log("File content preview (first 20 chars):", fileContent.substring(0, 20));
    
    return fileContent;
  } catch (error) {
    console.error("Error extracting file data for attachment:", error);
    return null;
  }
}
