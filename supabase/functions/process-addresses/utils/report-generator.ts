
/**
 * Utilities for generating HTML and CSV reports from scraping results
 */

/**
 * Generate an HTML report from scraping results
 */
export function generateHtmlReport(scrapingResults: any[]): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #333;">Postcode Matching Results</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Postcode</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Airbnb</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">SpareRoom</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Gumtree</th>
          </tr>
        </thead>
        <tbody>
          ${scrapingResults.map(result => `
            <tr>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">${result.postcode}</td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${formatCell(result.airbnb)}
              </td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${formatCell(result.spareroom)}
              </td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${formatCell(result.gumtree)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate a CSV report from scraping results
 */
export function generateCsvReport(scrapingResults: any[]): string {
  const headers = "Postcode,Airbnb,SpareRoom,Gumtree,Airbnb URL,SpareRoom URL,Gumtree URL\n";
  const rows = scrapingResults.map(result => {
    const airbnbStatus = result.airbnb?.status || "error";
    const spareroomStatus = result.spareroom?.status || "error";
    const gumtreeStatus = result.spareroom?.status || "error";
    
    const airbnbUrl = result.airbnb?.url || "";
    const spareroomUrl = result.spareroom?.url || "";
    const gumtreeUrl = result.gumtree?.url || "";
    
    return `"${result.postcode}","${airbnbStatus}","${spareroomStatus}","${gumtreeStatus}","${airbnbUrl}","${spareroomUrl}","${gumtreeUrl}"`;
  }).join("\n");
  
  return headers + rows;
}

/**
 * Format a cell in the HTML report
 */
export function formatCell(platformResult: any): string {
  if (!platformResult) {
    return `<span style="color: #999;">error</span>`;
  }
  
  if (platformResult.status === "error") {
    return `<span style="color: #999;">error</span>`;
  }
  
  if (platformResult.status === "no match") {
    return `<span style="color: #888;">no match</span>`;
  }
  
  if (platformResult.status === "investigate") {
    return `<a href="${platformResult.url}" target="_blank" style="color: #d9534f; font-weight: bold; text-decoration: underline;">investigate</a>`;
  }
  
  return `<span>${platformResult.status}</span>`;
}
