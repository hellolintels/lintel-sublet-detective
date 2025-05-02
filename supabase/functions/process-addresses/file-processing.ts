
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
    console.log("File name:", contact.file_name || "unnamed-file");
    
    // Ensure file_data is properly formatted for SendGrid
    // SendGrid requires base64 content without data URI prefix
    let fileContent = contact.file_data;
    
    // Check if the file_data is a Buffer or Uint8Array (which might happen if stored as bytea in Postgres)
    if (typeof fileContent !== 'string') {
      console.log("File data is not a string, converting to base64");
      // If it's binary data we need to convert it to base64 string
      try {
        // For Uint8Array or Buffer-like objects
        const textDecoder = new TextDecoder('utf-8');
        fileContent = btoa(textDecoder.decode(fileContent));
        console.log("Successfully converted binary data to base64");
      } catch (e) {
        console.error("Error converting binary to base64:", e);
        // Try stringifying instead if conversion fails
        fileContent = String(fileContent);
        console.log("Fell back to string conversion");
      }
    }
    
    // Check if the content already includes a data URI prefix and remove it if present
    if (typeof fileContent === 'string' && fileContent.includes('base64,')) {
      console.log("Removing data URI prefix from file_data");
      fileContent = fileContent.split('base64,')[1];
    }
    
    // Log a sample of the final content for debugging
    if (typeof fileContent === 'string') {
      console.log("Final file content sample (first 50 chars):", fileContent.substring(0, 50));
      console.log("Final file content length:", fileContent.length);
    } else {
      console.error("File content is not a string after processing, attachment will likely fail");
    }
    
    return fileContent;
  } catch (error) {
    console.error("Error extracting file data for attachment:", error);
    return null;
  }
}
