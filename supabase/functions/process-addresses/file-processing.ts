
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
  
  // Log additional information about the data for debugging
  console.log("Data string sample (first 100 chars):", dataString.substring(0, 100));
  console.log("Data string contains newlines:", dataString.includes("\n"));
  console.log("Data string contains carriage returns:", dataString.includes("\r"));
  
  // More robust line counting
  try {
    console.log("Splitting data into lines");
    // Use correct line ending detection for different OS formats
    const lines = dataString.split(/\r?\n/);
    console.log(`File contains ${lines.length} raw lines`);
    
    // Log a few sample lines for debugging
    if (lines.length > 0) console.log("First line:", lines[0]);
    if (lines.length > 1) console.log("Second line:", lines[1]);
    
    // More accurate counting - only count lines that have actual data
    // Empty lines and lines with only whitespace, commas, or quotes are not counted
    const nonEmptyLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !/^[,\s"]*$/.test(trimmed);
    }).length;
    
    console.log(`Found ${nonEmptyLines} non-empty lines`);
    
    // If we have non-empty lines and it's likely a CSV with headers, subtract the header row
    let dataRows = nonEmptyLines;
    if (nonEmptyLines > 1) {
      dataRows -= 1;
      console.log(`Assuming first line is header. Data rows: ${dataRows}`);
    } else {
      console.log(`No header assumed. Data rows: ${nonEmptyLines}`);
    }
    
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
    console.log("Raw file_data length:", contact.file_data.length);
    console.log("Raw file_data first 50 chars:", contact.file_data.substring(0, 50));
    
    // Handle bytea from Postgres - if it's starting with \x, it's a hex representation
    if (typeof contact.file_data === 'string' && contact.file_data.startsWith('\\x')) {
      console.log("Detected hex-encoded bytea data, converting to base64");
      
      // Remove the \x prefix
      const hexString = contact.file_data.substring(2);
      console.log(`Hex string length after removing prefix: ${hexString.length}`);
      console.log(`Hex string first 50 chars: ${hexString.substring(0, 50)}`);
      
      // Convert hex to binary array
      const binaryArray = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
      }
      console.log(`Binary array length: ${binaryArray.length}`);
      
      // Convert binary array to base64
      let binaryString = '';
      binaryArray.forEach(byte => {
        binaryString += String.fromCharCode(byte);
      });
      const base64Content = btoa(binaryString);
      console.log(`Base64 content length: ${base64Content.length}`);
      console.log(`Base64 content first 50 chars: ${base64Content.substring(0, 50)}`);
      
      // Verify base64 content is valid
      try {
        // Test decode a small sample
        if (base64Content.length > 0) {
          const testSample = base64Content.substring(0, Math.min(10, base64Content.length));
          atob(testSample);
          console.log("Base64 validity check passed");
        }
        return base64Content;
      } catch (e) {
        console.error("Invalid base64 data detected:", e);
        return null;
      }
    } 
    // If the content already includes a data URI prefix, remove it
    else if (typeof contact.file_data === 'string' && contact.file_data.includes('base64,')) {
      console.log("Removing data URI prefix from file_data");
      const base64Content = contact.file_data.split('base64,')[1];
      console.log(`Base64 content length after removing prefix: ${base64Content.length}`);
      console.log(`Base64 content first 50 chars: ${base64Content.substring(0, 50)}`);
      
      // Verify base64 content is valid
      try {
        if (base64Content.length > 0) {
          const testSample = base64Content.substring(0, Math.min(10, base64Content.length));
          atob(testSample);
          console.log("Base64 validity check passed");
        }
        return base64Content;
      } catch (e) {
        console.error("Invalid base64 data detected:", e);
        return null;
      }
    }
    // If it's already a clean base64 string
    else if (typeof contact.file_data === 'string') {
      const base64Content = contact.file_data.replace(/[^A-Za-z0-9+/=]/g, '');
      console.log(`Clean base64 string, length: ${base64Content.length}`);
      console.log(`Base64 content first 50 chars: ${base64Content.substring(0, 50)}`);
      
      // Verify base64 content is valid
      try {
        if (base64Content.length > 0) {
          const testSample = base64Content.substring(0, Math.min(10, base64Content.length));
          atob(testSample);
          console.log("Base64 validity check passed");
        }
        return base64Content;
      } catch (e) {
        console.error("Invalid base64 data detected:", e);
        return null;
      }
    } 
    // Handle other types as needed
    else {
      console.error("File data is not a string, cannot process");
      return null;
    }
  } catch (error) {
    console.error("Error extracting file data for attachment:", error);
    return null;
  }
}
