
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
      console.log("Converting hex-encoded bytea to text for CSV");
      
      // Remove the \x prefix
      const hexString = fileData.substring(2);
      console.log(`Hex string length after removing prefix: ${hexString.length}`);
      
      // Convert hex to binary array
      const binaryArray = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
      }
      
      console.log(`Binary array length: ${binaryArray.length}`);
      
      // For CSV files, convert to text directly (not base64)
      const decoder = new TextDecoder('utf-8');
      const csvText = decoder.decode(binaryArray);
      console.log(`Converted CSV text, length: ${csvText.length}`);
      console.log(`CSV sample (first 100 chars): ${csvText.substring(0, 100)}`);
      
      return csvText;
    } 
    // If file_data is already base64 but has a prefix like "data:application/csv;base64,"
    else if (typeof fileData === 'string' && fileData.includes('base64,')) {
      console.log("Extracting and decoding base64 data from data URI");
      const base64Content = fileData.split('base64,')[1];
      
      // Decode base64 to text for CSV
      try {
        const decodedText = atob(base64Content);
        console.log(`Decoded base64 to text, length: ${decodedText.length}`);
        console.log(`Decoded text sample (first 100 chars): ${decodedText.substring(0, 100)}`);
        return decodedText;
      } catch (e) {
        console.error("Error decoding base64:", e);
        return '';
      }
    } 
    // If it's already a clean base64 string
    else if (typeof fileData === 'string') {
      // Try to decode base64 to text for CSV
      try {
        // Clean the string of non-base64 characters
        const cleanBase64 = fileData.replace(/[^A-Za-z0-9+/=]/g, '');
        const decodedText = atob(cleanBase64);
        console.log(`Decoded base64 to text, length: ${decodedText.length}`);
        console.log(`Decoded text sample (first 100 chars): ${decodedText.substring(0, 100)}`);
        return decodedText;
      } catch (e) {
        console.error("Error decoding base64:", e);
        console.log("Using raw string as fallback");
        return fileData;
      }
    } else {
      console.error("Unsupported file_data format:", typeof fileData);
      return '';
    }
  } catch (e) {
    console.error("Error processing file data:", e);
    return '';
  }
}
