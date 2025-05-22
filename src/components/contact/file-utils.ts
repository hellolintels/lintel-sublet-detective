
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
          
          // More accurate counting - only count lines that have actual data
          // Empty lines and lines with only whitespace or commas are not counted
          const nonEmptyLines = lines.filter(line => {
            const trimmed = line.trim();
            // If empty or just commas/whitespace/quotes
            return trimmed.length > 0 && !/^[,\s"]*$/.test(trimmed);
          });
          
          console.log(`Total lines: ${lines.length}, non-empty lines: ${nonEmptyLines.length}`);
          
          // For CSV/Excel files, we assume the first line is a header if we have more than one line
          let dataRows = nonEmptyLines.length;
          
          // If we have data and it's likely a CSV with headers, subtract the header row
          if (dataRows > 1 && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            dataRows -= 1;
            console.log(`Subtracting header row. Estimated data rows: ${dataRows}`);
          } else {
            console.log(`No header row subtracted. Estimated data rows: ${dataRows}`);
          }
          
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
