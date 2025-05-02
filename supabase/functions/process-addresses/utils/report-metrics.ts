
/**
 * Utilities for calculating metrics from scraping results
 */

/**
 * Count the number of potential matches that need investigation
 * @param scrapingResults Results from scraping process
 * @returns Number of matches requiring investigation
 */
export function countMatches(scrapingResults: any[]): number {
  return scrapingResults.filter(result => {
    return result.airbnb?.status === "investigate" || 
           result.spareroom?.status === "investigate" || 
           result.gumtree?.status === "investigate";
  }).length;
}
