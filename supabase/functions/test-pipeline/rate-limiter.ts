
export class RateLimiter {
  private platformLimits = {
    airbnb: { daily: 300, hourly: 15 },
    spareroom: { daily: 250, hourly: 20 },
    gumtree: { daily: 250, hourly: 25 }
  };
  
  private requestCounts = {
    airbnb: { daily: 0, hourly: 0, lastHourReset: Date.now() },
    spareroom: { daily: 0, hourly: 0, lastHourReset: Date.now() },
    gumtree: { daily: 0, hourly: 0, lastHourReset: Date.now() }
  };

  canMakeRequest(platform: string): boolean {
    const now = Date.now();
    const platformCount = this.requestCounts[platform as keyof typeof this.requestCounts];
    
    if (now - platformCount.lastHourReset > 60 * 60 * 1000) {
      platformCount.hourly = 0;
      platformCount.lastHourReset = now;
    }
    
    const limits = this.platformLimits[platform as keyof typeof this.platformLimits];
    return platformCount.daily < limits.daily && platformCount.hourly < limits.hourly;
  }

  updateRequestCounts(platform: string): void {
    const platformCount = this.requestCounts[platform as keyof typeof this.requestCounts];
    platformCount.daily++;
    platformCount.hourly++;
  }

  getRequestCounts() {
    return this.requestCounts;
  }

  async waitBetweenRequests(type: 'platform' | 'batch'): Promise<void> {
    const delays = {
      platform: { min: 3000, max: 8000 },
      batch: { min: 1000, max: 2000 }
    };
    
    const delay = delays[type];
    const waitTime = Math.random() * (delay.max - delay.min) + delay.min;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}
