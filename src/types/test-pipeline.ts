
export interface TestResult {
  postcode: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  airbnb: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
    radius?: string;
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
  coordinate_lookup?: string;
  search_precision?: string;
  results: TestResult[];
  error?: string;
  message?: string;
}
