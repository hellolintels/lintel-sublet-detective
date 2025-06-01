
export function generateTestUrls(postcode: string): string[] {
  return [
    `https://www.airbnb.co.uk/s/${postcode.replace(' ', '-')}/homes`,
    `https://www.airbnb.co.uk/s/Glasgow/homes?query=${encodeURIComponent(postcode)}`,
    `https://www.airbnb.co.uk/s/Glasgow--United-Kingdom/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&query=${encodeURIComponent(postcode)}`
  ];
}
