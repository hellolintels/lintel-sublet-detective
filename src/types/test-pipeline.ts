
export interface PostcodeBoundary {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export interface TestResult {
  postcode: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  boundary?: PostcodeBoundary;
  airbnb: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
    radius?: string;
    boundary_method?: string;
  };
  spareroom: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
  };
  gumtree: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
  };
}

export interface TestSummary {
  total_postcodes: number;
  test_completed: string;
  connection_status: string;
  boundary_service?: string;
  search_precision?: string;
  improvements?: string;
  results: TestResult[];
  error?: string;
  message?: string;
}
