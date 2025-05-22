
/**
 * Processes file data for email attachments
 */
export function processFileData(fileContent: string): string {
  if (!fileContent || typeof fileContent !== 'string') {
    console.log("No valid file content to process");
    return '';
  }

  try {
    console.log(`Processing file content of length: ${fileContent.length}`);
    console.log(`Text sample (first 100 chars): ${fileContent.substring(0, 100)}`);
    
    // Check if the content might be binary data
    const isBinary = /[\x00-\x08\x0E-\x1F]/.test(fileContent.substring(0, 1000));
    console.log(`File content appears to be binary: ${isBinary}`);
    
    if (isBinary) {
      console.log("Converting binary content to base64");
      // Already binary, just encode to base64
      return btoa(fileContent);
    }
    
    // For text files (CSV, TXT), convert to base64
    console.log("Converting text content to base64");
    return btoa(fileContent);
  } catch (error) {
    console.error("Error processing file data:", error);
    
    // If btoa fails (which can happen with certain UTF-8 characters), 
    // try a more robust approach
    try {
      console.log("Trying TextEncoder for UTF-8 handling");
      const encoder = new TextEncoder();
      const bytes = encoder.encode(fileContent);
      
      // Convert bytes to a binary string
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      
      // Now encode to base64
      return btoa(binaryString);
    } catch (encoderError) {
      console.error("Error using TextEncoder:", encoderError);
      
      // Last resort: try to strip problematic characters
      try {
        const safeContent = fileContent.replace(/[^\x00-\x7F]/g, "?");
        return btoa(safeContent);
      } catch (lastError) {
        console.error("All encoding attempts failed:", lastError);
        return '';
      }
    }
  }
}
