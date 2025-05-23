
import { PostcodeResult } from './types.ts';

/**
 * Maximum number of rows allowed for a sample report
 */
export const MAX_ROWS = 120;

/**
 * Count rows in a file content
 */
export function countRows(content: string): number {
  try {
    // Remove any BOM character that might be present
    const cleanContent = content.replace(/^\uFEFF/, '');
    
    // Split by newline and count non-empty lines
    const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
    
    // Remove header row if present
    const dataRows = lines.length > 0 ? lines.length - 1 : 0;
    
    return dataRows > 0 ? dataRows : 0;
  } catch (error) {
    console.error("Error counting rows:", error);
    return 0;
  }
}

/**
 * Extract postcodes from file content
 */
export function extractPostcodes(content: string): PostcodeResult[] {
  try {
    console.log("Extracting postcodes from file content");
    
    // Clean content and split into lines
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
      console.warn("File contains no data rows");
      return [];
    }
    
    // Remove header row
    const dataRows = lines.slice(1);
    
    // UK postcodes regex pattern
    const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
    
    // Extract postcodes from each line
    const postcodes: PostcodeResult[] = [];
    const uniquePostcodes = new Set<string>();
    
    dataRows.forEach(line => {
      // Split by comma if CSV
      const parts = line.split(',');
      
      // Find a part that looks like a postcode
      for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(postcodeRegex);
        
        if (match) {
          const postcode = match[0].toUpperCase().replace(/\s+/g, ' ');
          
          // Only add unique postcodes
          if (!uniquePostcodes.has(postcode)) {
            uniquePostcodes.add(postcode);
            postcodes.push({
              postcode,
              address: line.trim()
            });
          }
          
          break;
        }
      }
    });
    
    console.log(`Found ${postcodes.length} unique postcodes`);
    return postcodes;
  } catch (error) {
    console.error("Error extracting postcodes:", error);
    return [];
  }
}

/**
 * Process file for email attachment
 */
export function processFileForEmailAttachment(content: string): string {
  try {
    // Convert to base64
    return btoa(content);
  } catch (error) {
    console.error("Error processing file for email attachment:", error);
    
    // Try UTF-8 encoding for special characters
    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      
      // Convert bytes to binary string
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      
      // Encode to base64
      return btoa(binaryString);
    } catch (encodingError) {
      console.error("All encoding attempts failed:", encodingError);
      return '';
    }
  }
}

/**
 * Generate a placeholder HTML report
 */
export function generatePlaceholderReport(postcodes: PostcodeResult[]): string {
  const timestamp = new Date().toISOString();
  
  // Build HTML
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Address Matching Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #F97316; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .match { background-color: #ffeeee; }
      </style>
    </head>
    <body>
      <h1>Property Matching Report</h1>
      <p>Generated on: ${timestamp}</p>
      <p>Total Addresses: ${postcodes.length}</p>
      
      <table>
        <tr>
          <th>Postcode</th>
          <th>Address</th>
          <th>Status</th>
        </tr>
  `;
  
  // Add rows for each postcode
  postcodes.forEach(p => {
    html += `
      <tr>
        <td>${p.postcode}</td>
        <td>${p.address || 'Not provided'}</td>
        <td>Pending analysis</td>
      </tr>
    `;
  });
  
  // Close table and HTML
  html += `
      </table>
      
      <p>This is a placeholder report. The actual analysis will be conducted soon.</p>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Generate a placeholder Excel report
 * This is a simplified version that returns a base64 encoded simple HTML table
 * which can be opened in Excel
 */
export function generatePlaceholderExcel(postcodes: PostcodeResult[], contact: any): string {
  // Create a simple HTML table that Excel can open
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv=Content-Type content="text/html; charset=utf-8">
      <meta name=ProgId content=Excel.Sheet>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Property Matches</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body>
      <table>
        <tr>
          <th>Client</th>
          <th>Company</th>
          <th>Report Date</th>
          <th>Total Properties</th>
        </tr>
        <tr>
          <td>${contact.full_name}</td>
          <td>${contact.company}</td>
          <td>${new Date().toISOString().split('T')[0]}</td>
          <td>${postcodes.length}</td>
        </tr>
      </table>
      
      <table>
        <tr>
          <th>Postcode</th>
          <th>Address</th>
          <th>Status</th>
          <th>Platform</th>
          <th>URL</th>
        </tr>
  `;
  
  // Add rows for each postcode
  postcodes.forEach(p => {
    html += `
      <tr>
        <td>${p.postcode}</td>
        <td>${p.address || 'Not provided'}</td>
        <td>Pending</td>
        <td></td>
        <td></td>
      </tr>
    `;
  });
  
  // Close table and HTML
  html += `
      </table>
    </body>
    </html>
  `;
  
  // Return as base64
  return btoa(html);
}
