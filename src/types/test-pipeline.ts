
export interface TestSummary {
  test_type: string;
  total_postcodes: number;
  test_completed: string;
  api_status: string;
  connection_status?: string;
  boundary_service?: string;
  search_precision?: string;
  improvements?: string;
  error?: string;
  
  // Enhanced diagnostics
  api_diagnostics?: {
    response_time_avg: number;
    success_rate: string;
    success_percentage: string;
    circuit_breaker_status: any;
  };
  
  // Performance metrics
  performance?: {
    airbnb_success_rate: string;
    spareroom_success_rate: string;
    gumtree_success_rate: string;
    total_matches_found: number;
    average_response_time: number;
    geographic_batching?: string;
    smart_proxy_strategy?: string;
  };
  
  // Credit usage
  credit_analytics?: {
    total_credits_used: number;
    premium_requests: number;
    standard_requests: number;
    daily_budget_remaining: number;
    cost_per_platform: any;
    credit_efficiency: string;
  };
  
  recommendations?: string[];
  overall_success: boolean;
  results?: TestResult[];
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
  creditCost?: number;
  search_method?: string;
  boundary_method?: string;
  precision?: string;
}
