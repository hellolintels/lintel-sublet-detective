
export interface PostcodeResult {
  postcode: string;
  address: string;
  streetName?: string;
  latitude?: number;
  longitude?: number;
}

export interface CoordinateResult {
  latitude: number;
  longitude: number;
  postcode: string;
}

export interface ScrapingResult {
  status: string;
  count: number;
  url?: string;
  search_method?: string;
  precision?: string;
  radius?: string;
  message?: string;
}

export interface TestResult {
  postcode: string;
  address: string;
  streetName: string;
  latitude?: number;
  longitude?: number;
  airbnb: ScrapingResult;
  spareroom: ScrapingResult;
  gumtree: ScrapingResult;
}
