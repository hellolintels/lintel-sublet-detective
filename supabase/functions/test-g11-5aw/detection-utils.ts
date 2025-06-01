
// Enhanced postcode detection function
export function detectPostcodeInHtml(html: string, postcode: string) {
  const lowerHtml = html.toLowerCase();
  const lowerPostcode = postcode.toLowerCase();
  
  // Direct match
  if (html.includes(postcode)) {
    return { found: true, method: 'exact_match', confidence: 1.0 };
  }
  
  // Case insensitive match
  if (lowerHtml.includes(lowerPostcode)) {
    return { found: true, method: 'case_insensitive', confidence: 0.9 };
  }
  
  // Split postcode parts (e.g., "G11" and "5AW")
  const parts = postcode.split(' ');
  if (parts.length === 2) {
    const part1Found = html.includes(parts[0]);
    const part2Found = html.includes(parts[1]);
    
    if (part1Found && part2Found) {
      return { found: true, method: 'split_parts', confidence: 0.8, parts: { part1: part1Found, part2: part2Found } };
    }
  }
  
  // URL-encoded version
  const encoded = encodeURIComponent(postcode);
  if (html.includes(encoded)) {
    return { found: true, method: 'url_encoded', confidence: 0.7 };
  }
  
  // No spaces version (G115AW)
  const noSpaces = postcode.replace(/\s+/g, '');
  if (html.includes(noSpaces)) {
    return { found: true, method: 'no_spaces', confidence: 0.6 };
  }
  
  // Hyphenated version (G11-5AW)
  const hyphenated = postcode.replace(/\s+/g, '-');
  if (html.includes(hyphenated)) {
    return { found: true, method: 'hyphenated', confidence: 0.7 };
  }
  
  return { found: false, method: 'none', confidence: 0.0 };
}

// Detect Airbnb anti-bot measures
export function detectAirbnbBlocking(html: string) {
  const blockingPatterns = [
    'Please verify you are a human',
    'Access to this page has been denied',
    'captcha',
    'challenge-platform',
    'blocked',
    'unusual traffic',
    'robot'
  ];
  
  const lowerHtml = html.toLowerCase();
  const detectedPatterns = blockingPatterns.filter(pattern => lowerHtml.includes(pattern.toLowerCase()));
  
  return {
    blocked: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    confidence: detectedPatterns.length > 0 ? Math.min(detectedPatterns.length / blockingPatterns.length, 1.0) : 0.0
  };
}

// Detect listings in HTML
export function detectListings(html: string) {
  const listingSelectors = [
    'data-testid="card-container"',
    'data-testid="listing-card"',
    'div.lxq01kf',
    '.t1jojoys',
    'listing',
    'property'
  ];
  
  let totalCount = 0;
  const foundSelectors = [];
  
  for (const selector of listingSelectors) {
    const regex = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (html.match(regex) || []).length;
    if (matches > 0) {
      totalCount += matches;
      foundSelectors.push({ selector, count: matches });
    }
  }
  
  return {
    count: totalCount,
    foundSelectors,
    hasListings: totalCount > 0
  };
}
