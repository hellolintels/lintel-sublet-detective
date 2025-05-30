
export function getExtractorsForPlatform(platform: string) {
  switch (platform) {
    case 'airbnb':
      return {
        listings: {
          selector: '[data-testid="card-container"], [data-testid="listing-card"]',
          extract: 'text'
        },
        totalCount: {
          selector: '[data-testid="homes-search-results-count"], .search-results-count, ._1l85cgq',
          extract: 'text'
        },
        mapInfo: {
          selector: '[data-testid="map"], .map-container',
          extract: 'text'
        }
      };
    case 'spareroom':
      return {
        listings: {
          selector: '.listing-result, .listingResult',
          extract: 'text'
        },
        totalCount: {
          selector: '.results-count, .search-results-summary',
          extract: 'text'
        }
      };
    case 'gumtree':
      return {
        listings: {
          selector: '.natural, .listing-link, .listing-item',
          extract: 'text'
        },
        totalCount: {
          selector: '.results-summary, .search-results-count',
          extract: 'text'
        }
      };
    default:
      return {
        listings: { selector: '.listing', extract: 'text' },
        totalCount: { selector: '.count', extract: 'text' }
      };
  }
}
