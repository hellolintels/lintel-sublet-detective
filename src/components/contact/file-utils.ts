
/**
 * Counts rows in CSV/Excel files
 */
export const countFileRows = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          resolve(0);
          return;
        }
        
        // For CSV files, count lines
        if (file.name.toLowerCase().endsWith('.csv')) {
          const lines = content.split('\n').filter(line => line.trim().length > 0);
          // Subtract 1 for header row
          resolve(lines.length > 0 ? lines.length - 1 : 0);
        } 
        // For Excel files, this is a simplified check - in reality we would need a proper Excel parser
        // For demo purposes, we'll just check if the file seems to have content
        else {
          // If it's not empty, assume it has at least one row
          // A more accurate implementation would use a library like xlsx to parse Excel files
          resolve(content.length > 100 ? 10 : 0); // Placeholder logic
        }
      } catch (error) {
        console.error("Error counting rows:", error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    
    // Read as text for CSV
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      // For Excel files, read as binary string 
      // (simplified approach - real implementation would use xlsx library)
      reader.readAsBinaryString(file);
    }
  });
};

/**
 * Converts file to base64 with improved error handling
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        console.log(`File converted to base64, length: ${reader.result.length}`);
        resolve(reader.result);
      } else {
        console.error("FileReader result is not a string:", reader.result);
        reject(new Error("Failed to convert file to base64 - result is not a string"));
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(error);
    };
    
    reader.onabort = () => {
      console.error("FileReader aborted");
      reject(new Error("File reading aborted"));
    };
    
    // Log file details before reading
    console.log(`Reading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    reader.readAsDataURL(file);
  });
};
