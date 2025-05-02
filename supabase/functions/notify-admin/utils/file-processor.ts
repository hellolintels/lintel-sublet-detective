
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
  
  let fileContent = '';
  
  try {
    // If file_data is a bytea from Postgres (starts with \x), convert it properly
    if (typeof fileData === 'string' && fileData.startsWith('\\x')) {
      console.log("Converting hex-encoded bytea to base64");
      
      // Remove the \x prefix and convert hex to base64
      const hexString = fileData.substring(2);
      
      // Convert hex to binary array
      const binaryArray = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
      }
      
      // Convert binary array to base64
      let binaryString = '';
      binaryArray.forEach(byte => {
        binaryString += String.fromCharCode(byte);
      });
      fileContent = btoa(binaryString);
      
      console.log("Converted hex bytea to base64, length:", fileContent.length);
    } 
    // If file_data is already base64 but has a prefix like "data:application/csv;base64,"
    else if (typeof fileData === 'string' && fileData.includes('base64,')) {
      fileContent = fileData.split('base64,')[1];
      console.log("Extracted base64 data from data URI, length:", fileContent.length);
    } 
    // If it's already a clean base64 string
    else if (typeof fileData === 'string') {
      fileContent = fileData;
      console.log("Using provided file_data as is, length:", fileContent.length);
    } 
    // If it's binary data (Uint8Array)
    else if (fileData instanceof Uint8Array) {
      let binaryString = '';
      for (let i = 0; i < fileData.length; i++) {
        binaryString += String.fromCharCode(fileData[i]);
      }
      fileContent = btoa(binaryString);
      console.log("Converted binary data to base64, length:", fileContent.length);
    } else {
      console.error("Unsupported file_data format:", typeof fileData);
      return '';
    }
    
    // Clean up the base64 string to ensure it only contains valid base64 characters
    fileContent = fileContent.replace(/[^A-Za-z0-9+/=]/g, '');
    console.log("Base64 content length after cleaning:", fileContent.length);
    
    // Validate the base64 content
    if (fileContent.length > 0) {
      // Test decode a small sample to verify it's valid base64
      atob(fileContent.substring(0, Math.min(10, fileContent.length)));
      console.log("Base64 validation successful");
    } else {
      console.log("Empty file content after processing");
    }
    
    return fileContent;
  } catch (e) {
    console.error("Error processing file data:", e);
    return '';
  }
}
