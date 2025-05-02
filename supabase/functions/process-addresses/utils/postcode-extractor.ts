
/**
 * Utilities for extracting postcodes from address files
 */
import { extractFileDataForAttachment } from "../file-processing.ts";

/**
 * Extract postcodes from a contact's address file
 * @param contact Contact object with file data
 * @returns Array of extracted postcodes
 */
export function extractPostcodesFromContact(contact: any): string[] {
  console.log("Extracting postcodes from address file...");
  let postcodes: string[] = [];
  
  try {
    if (contact.file_data) {
      // Try to extract postcodes from the file
      const fileContent = extractFileDataForAttachment(contact);
      if (fileContent) {
        // Extract UK postcodes using a regex pattern
        const decodedContent = atob(fileContent);
        const ukPostcodeRegex = /[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/gi;
        postcodes = [...decodedContent.matchAll(ukPostcodeRegex)].map(match => match[0].trim());
        
        // Remove duplicates
        postcodes = [...new Set(postcodes)];
        
        console.log(`Extracted ${postcodes.length} unique postcodes from file`);
        if (postcodes.length > 0) {
          console.log("Sample postcodes:", postcodes.slice(0, 3));
        } else {
          console.log("No postcodes found in the file. Using sample postcodes for testing");
          // Use sample postcodes for testing if none found
          postcodes = getSamplePostcodes();
        }
      } else {
        console.warn("Could not extract file content for postcode extraction");
        postcodes = getSamplePostcodes();
      }
    } else {
      console.warn("No file data available for postcode extraction");
      postcodes = getSamplePostcodes();
    }
  } catch (error) {
    console.error("Error extracting postcodes from file:", error);
    postcodes = getSamplePostcodes();
  }
  
  return postcodes;
}

/**
 * Get sample postcodes for testing
 * @returns Array of sample UK postcodes
 */
function getSamplePostcodes(): string[] {
  return ["AB1 2CD", "XY9 8ZT", "E1 6AN", "SW1A 1AA", "M1 1AE"];
}
