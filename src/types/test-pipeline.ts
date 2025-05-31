
export interface TestSummary {
  test_type: string;
  total_postcodes: number;
  test_completed: string;
  api_status: string;
  boundary_service?: string;
  search_precision?: string;
  coordinate_precision?: string;
  error?: string;
  
  summary?: {
    test_type: string;
    total_postcodes: number;
    total_platform_tests: number;
    success_rate: string;
    result_breakdown: {
      properties_found: number;
      no_properties: number;
      errors: number;
    };
    accuracy_metrics: {
      coordinate_based_searches: number;
      address_based_searches: number;
      postcode_only_searches: number;
    };
    platform_performance: {
      airbnb: PlatformStats;
      spareroom: PlatformStats;
      gumtree: PlatformStats;
    };
    scraping_bee_usage: {
      requestsUsed: number;
      requestsRemaining: number;
      dailyLimit: number;
    };
    recommendations: string[];
  };
  
  recommendations?: string[];
  overall_success: boolean;
  results?: TestResult[];
}

export interface PlatformStats {
  investigated: number;
  no_match: number;
  errors: number;
  avg_confidence: string;
}

export interface TestResult {
  postcode: string;
  address: string;
  streetName: string;
  latitude?: number;
  longitude?: number;
  boundary?: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  airbnb: PlatformResult;
  spareroom: PlatformResult;
  gumtree: PlatformResult;
}

export interface PlatformResult {
  status: "investigate" | "no_match" | "error";
  count: number;
  confidence?: string;
  message?: string;
  url?: string;
  listing_url?: string;
  map_view_url?: string;
  responseTime?: number;
  credit_cost?: number;
  search_method?: string;
  precision?: string;
  validation_score?: number;
  extracted_postcode?: string;
  accuracy_reasons?: string[];
  requests_remaining?: number;
}
