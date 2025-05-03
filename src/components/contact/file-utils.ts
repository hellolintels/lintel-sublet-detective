
/**
 * Reads a file and returns its contents as a base64 string
 * @param file The file to read
 * @returns Promise resolving to a base64 encoded string
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        if (reader.result) {
          // Get base64 string with data URI
          const base64String = reader.result as string;
          console.log(`File successfully read, base64 length: ${base64String.length}`);
          resolve(base64String);
        } else {
          reject(new Error("FileReader result is null"));
        }
      } catch (error) {
        console.error("Error in onload handler:", error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("FileReader error: " + reader.error?.message));
    };
    
    try {
      reader.readAsDataURL(file);
      console.log(`Reading file as DataURL: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    } catch (error) {
      console.error("Error reading file:", error);
      reject(error);
    }
  });
}

/**
 * Counts the approximate number of rows in a file
 * @param file The file to count rows in
 * @returns Promise resolving to the number of rows
 */
export function countFileRows(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target || !e.target.result) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        const content = e.target.result as string;
        
        // Split by newlines and count
        const lines = content.split(/\r\n|\r|\n/);
        
        // Filter out empty lines
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        // Assume first line is header, so actual data rows are count - 1
        // If there's only one line or none, return 0
        const dataRows = nonEmptyLines.length > 1 ? nonEmptyLines.length - 1 : 0;
        
        resolve(dataRows);
      } catch (error) {
        console.error("Error counting rows:", error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Error reading file for row count"));
    };
    
    // Read as text to count lines
    reader.readAsText(file);
  });
}
