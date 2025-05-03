
/**
 * Processes file data from different formats into a clean string or base64
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
        console.log(`CSV sample (first 100 chars): ${csvText.substring(0, 100)}`);
        
        return csvText;
      } catch (conversionError) {
        console.error("Error converting hex to text:", conversionError);
        
        // Fallback: return base64 encoded version of the binary data
        try {
          const base64Data = btoa(String.fromCharCode.apply(null, Array.from(hexString.match(/.{1,2}/g)!).map(hex => parseInt(hex, 16))));
          console.log("Converted to base64 as fallback");
          return base64Data;
        } catch (base64Error) {
          console.error("Base64 fallback failed:", base64Error);
          return fileData; // Return original as last resort
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
      // Check if it looks like base64
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      const isLikelyBase64 = base64Regex.test(fileData.replace(/\s/g, '')) && fileData.length % 4 === 0;
      
      if (isLikelyBase64) {
        // Try to decode base64 to text
        try {
          const decodedText = atob(fileData);
          console.log(`Decoded base64 to text, length: ${decodedText.length}`);
          console.log(`Decoded text sample (first 100 chars): ${decodedText.substring(0, 100)}`);
          return decodedText;
        } catch (e) {
          console.error("Error decoding base64:", e);
          // If it fails, it might not be base64 after all
        }
      }
      
      // Use as plain text (if it wasn't base64 or decoding failed)
      console.log("Using as plain text");
      console.log(`Text sample (first 100 chars): ${fileData.substring(0, 100)}`);
      return fileData;
    } else {
      console.error("Unsupported file_data format:", typeof fileData);
      return JSON.stringify(fileData); // Convert to JSON string as last resort
    }
  } catch (e) {
    console.error("Error processing file data:", e);
    // Return empty string or some placeholder on error
    return '';
  }
}
