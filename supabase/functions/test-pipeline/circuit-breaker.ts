
import { CircuitBreakerStatus } from './enhanced-types.ts';

export class CircuitBreakerManager {
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();

  isCircuitBreakerOpen(platform: string): boolean {
    const breaker = this.circuitBreakers.get(platform);
    if (!breaker) return false;
    
    if (breaker.isOpen) {
      const cooldownPeriods = { airbnb: 2 * 60 * 60 * 1000, spareroom: 60 * 60 * 1000, gumtree: 30 * 60 * 1000 };
      const cooldown = cooldownPeriods[platform as keyof typeof cooldownPeriods] || 60 * 60 * 1000;
      
      if (Date.now() - breaker.lastFailure > cooldown) {
        breaker.isOpen = false;
        breaker.failures = 0;
        console.log(`🔄 Circuit breaker reset for ${platform}`);
      }
    }
    
    return breaker.isOpen;
  }

  recordFailure(platform: string): void {
    const thresholds = { airbnb: 3, spareroom: 5, gumtree: 7 };
    const threshold = thresholds[platform as keyof typeof thresholds] || 5;
    
    if (!this.circuitBreakers.has(platform)) {
      this.circuitBreakers.set(platform, { failures: 0, lastFailure: 0, isOpen: false });
    }
    
    const breaker = this.circuitBreakers.get(platform)!;
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= threshold) {
      breaker.isOpen = true;
      console.log(`🚫 Circuit breaker OPENED for ${platform} (${breaker.failures} failures)`);
    }
  }

  resetFailures(platform: string): void {
    if (this.circuitBreakers.has(platform)) {
      this.circuitBreakers.get(platform)!.failures = 0;
    }
  }

  getFailureCount(platform: string): number {
    return this.circuitBreakers.get(platform)?.failures || 0;
  }

  getCircuitBreakerStatus(): CircuitBreakerStatus {
    return {
      airbnb: {
        isOpen: this.circuitBreakers.get('airbnb')?.isOpen || false,
        failures: this.circuitBreakers.get('airbnb')?.failures || 0
      },
      spareroom: {
        isOpen: this.circuitBreakers.get('spareroom')?.isOpen || false,
        failures: this.circuitBreakers.get('spareroom')?.failures || 0
      },
      gumtree: {
        isOpen: this.circuitBreakers.get('gumtree')?.isOpen || false,
        failures: this.circuitBreakers.get('gumtree')?.failures || 0
      }
    };
  }
}
