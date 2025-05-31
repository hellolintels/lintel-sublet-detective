
export class RateLimiter {
  private platformLimits = {
    airbnb: { daily: 200, hourly: 10 }, // Reduced limits for anti-blocking
    spareroom: { daily: 150, hourly: 12 },
    gumtree: { daily: 150, hourly: 15 }
  };
  
  private requestCounts = {
    airbnb: { daily: 0, hourly: 0, lastHourReset: Date.now() },
    spareroom: { daily: 0, hourly: 0, lastHourReset: Date.now() },
    gumtree: { daily: 0, hourly: 0, lastHourReset: Date.now() }
  };

  private conservativeMode = true; // Enable conservative mode by default

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
    // Conservative delays with jitter for human-like behavior
    const delays = this.conservativeMode ? {
      platform: { min: 5000, max: 12000 }, // Increased from 3-8s to 5-12s
      batch: { min: 2000, max: 4000 }      // Increased from 1-2s to 2-4s
    } : {
      platform: { min: 3000, max: 8000 },
      batch: { min: 1000, max: 2000 }
    };
    
    const delay = delays[type];
    const baseWait = Math.random() * (delay.max - delay.min) + delay.min;
    
    // Add jitter (±20%) to make timing more human-like
    const jitter = (Math.random() - 0.5) * 0.4 * baseWait;
    const waitTime = Math.max(1000, baseWait + jitter);
    
    console.log(`⏱️ Anti-blocking delay: ${Math.round(waitTime)}ms for ${type}`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  setConservativeMode(enabled: boolean): void {
    this.conservativeMode = enabled;
    console.log(`🛡️ Conservative mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  isConservativeMode(): boolean {
    return this.conservativeMode;
  }
}
