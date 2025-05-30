
export interface WebSocketScrapingResult {
  status: string;
  count: number;
  totalFound?: number;
  url: string;
  search_method: string;
  boundary_method: string;
  precision: string;
  message?: string;
  matches?: any[];
}
