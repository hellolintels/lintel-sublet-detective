
/**
 * Counts the approximate number of rows in a file
 * @param file The uploaded file to count rows in
 * @returns A promise that resolves to the number of rows
 */
export async function countFileRows(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            console.error("Could not read file content");
            resolve(0);
            return;
          }
          
          console.log(`File content length: ${content.length} characters`);
          
          // Split by different types of line endings to handle various file formats
          const lines = content.split(/\r?\n/);
          const nonEmptyLines = lines.filter(line => line.trim().length > 0);
          
          console.log(`Total lines: ${lines.length}, non-empty lines: ${nonEmptyLines.length}`);
          
          // If we have at least one non-empty line, assume it's the header and subtract 1
          // But don't go below 0
          const dataRows = nonEmptyLines.length > 1 ? nonEmptyLines.length - 1 : nonEmptyLines.length;
          console.log(`Estimated data rows: ${dataRows}`);
          
          resolve(dataRows);
        } catch (error) {
          console.error("Error parsing file content:", error);
          resolve(0);
        }
      };
      
      reader.onerror = () => {
        console.error("FileReader error");
        resolve(0);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Exception in countFileRows:", error);
      resolve(0);
    }
  });
}
