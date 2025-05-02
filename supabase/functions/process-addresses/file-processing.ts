
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
    
    const lineCount = Math.max(0, lines.length - 1); // Subtract 1 for header
    console.log(`Counted ${lineCount} data rows (excluding header)`);
    return lineCount;
  } catch (error) {
    console.error("Error counting lines:", error);
    return 0; // Return 0 as a safe default
  }
}

/**
 * Extract file data from a contact record for attachment
 * This function handles various formats the file data might be in
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
    if (typeof contact.file_data === 'string') {
      // If it's already a string, use it directly
      console.log("File data is string type, length:", contact.file_data.length);
      return contact.file_data;
    } 
    
    if (contact.file_data instanceof Uint8Array) {
      // Convert Uint8Array to base64 string
      const fileContent = btoa(String.fromCharCode(...contact.file_data));
      console.log("Converted Uint8Array to base64, length:", fileContent.length);
      return fileContent;
    }
    
    // Handle PostgreSQL bytea type which might come as an object
    console.log("File data appears to be an object");
    
    if (typeof contact.file_data.toString === 'function') {
      try {
        // Try to use toString method if available
        const fileContent = contact.file_data.toString('base64');
        console.log("Used toString('base64'), length:", fileContent.length);
        return fileContent;
      } catch (e) {
        console.error("Error using toString('base64'):", e);
      }
    }
    
    // As a last resort, stringify the object
    const fileContent = JSON.stringify(contact.file_data);
    console.log("Used JSON.stringify as fallback, length:", fileContent.length);
    return fileContent;
  } catch (error) {
    console.error("Error extracting file data for attachment:", error);
    return null;
  }
}
