
/**
 * Processes file data from different formats into a clean base64 string
 * @param fileData The file data in various possible formats
 * @returns Clean base64 string or empty string if processing fails
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
      console.log("Converting hex-encoded bytea to base64");
      
      // Remove the \x prefix
      const hexString = fileData.substring(2);
      console.log(`Hex string length after removing prefix: ${hexString.length}`);
      
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
      const fileContent = btoa(binaryString);
      
      // Generate hash to verify integrity
      const hashArray = Array.from(binaryArray);
      const hashHex = hashArray.slice(0, Math.min(10, hashArray.length))
                              .map(b => b.toString(16).padStart(2, '0')).join('');
      console.log(`BYTEA CONVERSION SAMPLE: ${hashHex}...`);
      console.log(`Base64 content length: ${fileContent.length}`);
      
      return fileContent;
    } 
    // If file_data is already base64 but has a prefix like "data:application/csv;base64,"
    else if (typeof fileData === 'string' && fileData.includes('base64,')) {
      console.log("Extracting base64 data from data URI");
      const fileContent = fileData.split('base64,')[1];
      console.log(`Base64 content length after extracting: ${fileContent.length}`);
      return fileContent;
    } 
    // If it's already a clean base64 string
    else if (typeof fileData === 'string') {
      console.log(`Using provided file_data as is, length: ${fileContent.length}`);
      return fileContent.replace(/[^A-Za-z0-9+/=]/g, '');
    } else {
      console.error("Unsupported file_data format:", typeof fileData);
      return '';
    }
  } catch (e) {
    console.error("Error processing file data:", e);
    return '';
  }
}
