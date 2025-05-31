
import { PostcodeResult, TestResult } from './types.ts';

export interface EnhancedScrapingBeeResults {
  testResults: TestResult[];
  apiWorking: boolean;
  avgResponseTime: number;
  successfulRequests: number;
  totalRequests: number;
  creditUsage: CreditUsageStats;
  circuitBreakerStatus: CircuitBreakerStatus;
  recommendations: string[];
  overallSuccess: boolean;
}

export interface CreditUsageStats {
  totalCreditsUsed: number;
  premiumRequestsUsed: number;
  standardRequestsUsed: number;
  dailyBudgetRemaining: number;
  costBreakdown: {
    airbnb: number;
    spareroom: number;
    gumtree: number;
  };
}

export interface CircuitBreakerStatus {
  airbnb: { isOpen: boolean; failures: number; nextRetryTime?: number };
  spareroom: { isOpen: boolean; failures: number; nextRetryTime?: number };
  gumtree: { isOpen: boolean; failures: number; nextRetryTime?: number };
}

export interface PostcodeGroup {
  area: string;
  postcodes: PostcodeResult[];
  priority: 'high' | 'medium' | 'low';
}

export interface PlatformConfig {
  params: Record<string, string>;
  creditCost: number;
  description: string;
}

export interface GroupResults {
  results: TestResult[];
  responseTimes: number[];
  successCount: number;
  totalRequests: number;
}
