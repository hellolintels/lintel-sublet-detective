
import { PostcodeResult, MatchResult } from './types.ts';

/**
 * Placeholder scraper that will be expanded for real scraping in the future
 * Returns fake data for testing purposes
 */
export async function scrapePlaceholders(postcodes: PostcodeResult[]): Promise<PostcodeResult[]> {
  console.log(`Placeholder scraping for ${postcodes.length} postcodes`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Add fake matches to about 10% of postcodes
  return postcodes.map((p, index) => {
    // Every 10th postcode gets a "match"
    if (index % 10 === 0) {
      return {
        ...p,
        matches: [
          {
            platform: 'airbnb',
            url: `https://www.airbnb.com/rooms/12345?postcode=${p.postcode}`,
          }
        ]
      };
    }
    
    // Every 7th postcode gets a "match" on another platform
    if (index % 7 === 0) {
      return {
        ...p,
        matches: [
          {
            platform: 'spareroom',
            url: `https://www.spareroom.co.uk/flatshare/flatshare_detail.pl?flatshare_id=12345&postcode=${p.postcode}`,
          }
        ]
      };
    }
    
    return p;
  });
}

/**
 * Factory function to get the appropriate scraper
 * This will be expanded to support different scrapers
 */
export function getScraperForType(type: string) {
  switch (type) {
    case 'scrapingbee':
      return scrapePlaceholders;
    case 'aws':
      return scrapePlaceholders;
    default:
      return scrapePlaceholders;
  }
}

/**
 * Count matches from scraping results
 */
export function countMatches(results: PostcodeResult[]): number {
  return results.filter(r => r.matches && r.matches.length > 0).length;
}

/**
 * Interface for future scraper implementations
 */
export interface Scraper {
  name: string;
  scrape(postcodes: PostcodeResult[]): Promise<PostcodeResult[]>;
  isConfigured(): boolean;
}

/**
 * Base class for future scrapers
 */
export class BaseScraper implements Scraper {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  async scrape(postcodes: PostcodeResult[]): Promise<PostcodeResult[]> {
    return scrapePlaceholders(postcodes);
  }
  
  isConfigured(): boolean {
    return true;
  }
}

// In the future, we will implement concrete scraper classes that extend BaseScraper
