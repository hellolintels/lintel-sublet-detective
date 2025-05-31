
export class BlockingDetector {
  private blockingPatterns = [
    'access denied',
    'access to this page has been denied',
    'please verify you are a human',
    'captcha',
    'too many requests',
    'rate limit',
    'temporarily unavailable',
    'service unavailable',
    'cloudflare',
    'please complete the security check',
    'unusual traffic',
    'blocked',
    'forbidden'
  ];

  private suspiciousIndicators = [
    'javascript is required',
    'enable javascript',
    'browser check',
    'loading...',
    'please wait'
  ];

  analyzeForBlocking(html: string, platform: string, url: string): {
    isBlocked: boolean;
    isSuspicious: boolean;
    confidence: number;
    indicators: string[];
    recommendation: string;
  } {
    const htmlLower = html.toLowerCase();
    const indicators: string[] = [];
    let blockingScore = 0;
    let suspiciousScore = 0;

    // Check for blocking patterns
    this.blockingPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern)) {
        indicators.push(`Blocking pattern: "${pattern}"`);
        blockingScore += 2;
      }
    });

    // Check for suspicious indicators
    this.suspiciousIndicators.forEach(pattern => {
      if (htmlLower.includes(pattern)) {
        indicators.push(`Suspicious: "${pattern}"`);
        suspiciousScore += 1;
      }
    });

    // Check HTML length (very short responses are suspicious)
    if (html.length < 500) {
      indicators.push(`Very short response: ${html.length} chars`);
      suspiciousScore += 1;
    } else if (html.length < 2000) {
      indicators.push(`Short response: ${html.length} chars`);
      suspiciousScore += 0.5;
    }

    // Check for redirect patterns
    if (htmlLower.includes('redirect') || htmlLower.includes('location.href')) {
      indicators.push('Redirect detected');
      suspiciousScore += 1;
    }

    // Platform-specific checks
    if (platform === 'airbnb' && !htmlLower.includes('airbnb')) {
      indicators.push('Missing platform branding');
      suspiciousScore += 1;
    }

    const totalScore = blockingScore + suspiciousScore;
    const isBlocked = blockingScore >= 2;
    const isSuspicious = suspiciousScore >= 2 || totalScore >= 3;
    const confidence = Math.min(100, totalScore * 20);

    let recommendation = '';
    if (isBlocked) {
      recommendation = `🚫 BLOCKED: ${platform} is likely blocking requests. Consider increasing delays and using stealth mode.`;
    } else if (isSuspicious) {
      recommendation = `⚠️ SUSPICIOUS: ${platform} response seems unusual. Monitor for blocking patterns.`;
    } else {
      recommendation = `✅ NORMAL: ${platform} response appears legitimate.`;
    }

    if (indicators.length > 0) {
      console.log(`🔍 ${platform} blocking analysis:`, {
        isBlocked,
        isSuspicious,
        confidence,
        indicators,
        htmlLength: html.length
      });
    }

    return {
      isBlocked,
      isSuspicious,
      confidence,
      indicators,
      recommendation
    };
  }

  logBlockingAlert(platform: string, analysis: any): void {
    if (analysis.isBlocked) {
      console.error(`🚨 BLOCKING ALERT: ${platform} is blocking requests!`);
      console.error(`Confidence: ${analysis.confidence}%`);
      console.error(`Indicators: ${analysis.indicators.join(', ')}`);
    } else if (analysis.isSuspicious) {
      console.warn(`⚠️ SUSPICIOUS ACTIVITY: ${platform} response is unusual`);
      console.warn(`Indicators: ${analysis.indicators.join(', ')}`);
    }
  }
}
