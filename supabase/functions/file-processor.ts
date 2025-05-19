
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
    
    // For text files (CSV, TXT), convert to base64
    // Fix: use TextEncoder instead of Buffer for Deno compatibility
    return btoa(fileContent);
  } catch (error) {
    console.error("Error processing file data:", error);
    return '';
  }
}
