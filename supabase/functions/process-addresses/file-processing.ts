
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
    let fileContent = contact.file_data;
    
    // Handle bytea from Postgres - if it's starting with \x, it's a hex representation
    if (typeof fileContent === 'string' && fileContent.startsWith('\\x')) {
      console.log("Detected hex-encoded bytea data, converting to base64");
      
      // Remove the \x prefix and convert hex to base64
      const hexString = fileContent.substring(2);
      
      // Convert hex to binary array
      const binaryArray = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
      }
      
      // Convert binary array to base64
      const textDecoder = new TextDecoder('utf-8');
      try {
        const decoded = textDecoder.decode(binaryArray);
        fileContent = btoa(decoded);
        console.log("Successfully converted hex bytea to base64");
      } catch (e) {
        console.error("Error decoding binary data:", e);
        
        // Fallback: direct binary to base64 conversion without text decoding
        let binaryString = '';
        binaryArray.forEach(byte => {
          binaryString += String.fromCharCode(byte);
        });
        fileContent = btoa(binaryString);
        console.log("Fallback conversion of binary data to base64 completed");
      }
    }
    // If the content already includes a data URI prefix, remove it
    else if (typeof fileContent === 'string' && fileContent.includes('base64,')) {
      console.log("Removing data URI prefix from file_data");
      fileContent = fileContent.split('base64,')[1];
    }
    // Binary data (Buffer or Uint8Array)
    else if (typeof fileContent !== 'string') {
      console.log("File data is not a string, converting to base64");
      
      try {
        // For Uint8Array or Buffer-like objects
        const textDecoder = new TextDecoder('utf-8');
        let binaryString = '';
        if (fileContent instanceof Uint8Array) {
          for (let i = 0; i < fileContent.length; i++) {
            binaryString += String.fromCharCode(fileContent[i]);
          }
        } else {
          // Try to convert to string using available methods
          binaryString = String(fileContent);
        }
        fileContent = btoa(binaryString);
        console.log("Successfully converted binary data to base64");
      } catch (e) {
        console.error("Error converting binary to base64:", e);
        // Try stringifying instead if conversion fails
        fileContent = String(fileContent);
        console.log("Fell back to string conversion");
      }
    }
    
    // Make sure we are returning a valid base64 string - cleanup any non-base64 characters
    if (typeof fileContent === 'string') {
      // Clean up the base64 string to ensure it only contains valid base64 characters
      fileContent = fileContent.replace(/[^A-Za-z0-9+/=]/g, '');
      console.log("Cleaned base64 string, length:", fileContent.length);
    } else {
      console.error("File content is not a string after processing");
      return null;
    }
    
    // Log a sample of the final content for debugging
    if (typeof fileContent === 'string') {
      console.log("Final file content sample (first 50 chars):", fileContent.substring(0, 50));
      console.log("Final file content length:", fileContent.length);
    }
    
    // Test base64 validity by trying to decode a small sample
    try {
      if (typeof fileContent === 'string' && fileContent.length > 10) {
        const testSample = fileContent.substring(0, 10);
        atob(testSample);
        console.log("Base64 validity check passed");
      }
    } catch (e) {
      console.error("Base64 validation failed! This is not valid base64:", e);
      return null;
    }
    
    return fileContent;
  } catch (error) {
    console.error("Error extracting file data for attachment:", error);
    return null;
  }
}
