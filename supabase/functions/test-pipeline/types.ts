
export interface PostcodeBoundary {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export interface OSDataHubResult {
  postcode: string;
  boundary: PostcodeBoundary;
  geometry?: any; // Full geometry data if needed
}

export interface PostcodeResult {
  postcode: string;
  address: string;
  streetName?: string;
  latitude?: number;
  longitude?: number;
  boundary?: PostcodeBoundary;
}

export interface CoordinateResult {
  latitude: number;
  longitude: number;
  postcode: string;
  boundary?: PostcodeBoundary;
}

export interface ScrapingResult {
  status: string;
  count: number;
  url?: string;
  search_method?: string;
  precision?: string;
  radius?: string;
  boundary_method?: string;
  message?: string;
}

export interface TestResult {
  postcode: string;
  address: string;
  streetName: string;
  latitude?: number;
  longitude?: number;
  boundary?: PostcodeBoundary;
  airbnb: ScrapingResult;
  spareroom: ScrapingResult;
  gumtree: ScrapingResult;
}
