
/**
 * Processes file data from different formats into a clean string
 * with improved error handling and detailed logging
 * @param fileData The file data in various possible formats
 * @returns Clean string content or empty string if processing fails
 */
export function processFileData(fileData: any): string {
  if (!fileData) {
    console.log("No file data to process");
    return '';
  }
  
  console.log(`File data type: ${typeof fileData}`);
  
  try {
    // If file_data is a bytea from Postgres (starts with \x), convert it properly
    if (typeof fileData === 'string' && fileData.startsWith('\\x')) {
      console.log("Converting hex-encoded bytea to text");
      
      // Remove the \x prefix
      const hexString = fileData.substring(2);
      console.log(`Hex string length after removing prefix: ${hexString.length}`);
      
      try {
        // Convert hex to binary array
        const binaryArray = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
        }
        
        console.log(`Binary array length: ${binaryArray.length}`);
        
        // For CSV files, convert to text directly
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(binaryArray);
        console.log(`Converted CSV text, length: ${csvText.length}`);
        if (csvText.length > 0) {
          console.log(`CSV sample (first 100 chars): ${csvText.substring(0, 100)}`);
          return csvText;
        } else {
          throw new Error("Empty text after decoding");
        }
      } catch (conversionError) {
        console.error("Error converting hex to text:", conversionError);
        
        // Fallback: create base64 directly from hex
        try {
          // Convert each hex pair to a character code
          let textData = '';
          for (let i = 0; i < hexString.length; i += 2) {
            textData += String.fromCharCode(parseInt(hexString.substring(i, i + 2), 16));
          }
          
          console.log("Created text data from hex, length:", textData.length);
          if (textData.length > 0) {
            console.log(`Text sample: ${textData.substring(0, 100)}`);
            return textData;
          } else {
            throw new Error("Empty text after conversion");
          }
        } catch (textConversionError) {
          console.error("Text conversion failed:", textConversionError);
          
          // Last resort: return the raw hex
          console.log("Using raw hex as fallback");
          return fileData;
        }
      }
    } 
    // If file_data is already base64 but has a prefix like "data:application/csv;base64,"
    else if (typeof fileData === 'string' && fileData.includes('base64,')) {
      console.log("Extracting base64 data from data URI");
      const base64Content = fileData.split('base64,')[1];
      
      // Decode base64 to text for CSV
      try {
        const decodedText = atob(base64Content);
        console.log(`Decoded base64 to text, length: ${decodedText.length}`);
        console.log(`Decoded text sample (first 100 chars): ${decodedText.substring(0, 100)}`);
        return decodedText;
      } catch (e) {
        console.error("Error decoding base64:", e);
        // Return the raw base64 content if decoding fails
        return base64Content;
      }
    } 
    // If it's already a clean base64 string or plain text
    else if (typeof fileData === 'string') {
      // Just use as plain text
      console.log("Using as plain text");
      console.log(`Text length: ${fileData.length}`);
      console.log(`Text sample (first 100 chars): ${fileData.substring(0, 100)}`);
      return fileData;
    } else {
      console.error("Unsupported file_data format:", typeof fileData);
      return JSON.stringify(fileData); // Convert to JSON string as last resort
    }
  } catch (e) {
    console.error("Error processing file data:", e);
    console.error("Error details:", e instanceof Error ? e.message : String(e));
    
    // Return original data as fallback
    return typeof fileData === 'string' ? fileData : JSON.stringify(fileData);
  }
}
