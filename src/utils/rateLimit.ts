export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  checkLimit(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= this.maxRequests) {
      console.log(`⚠️ 速率限制：${key} 超过限制 (${this.maxRequests}次/${this.windowMs/1000}秒)`);
      return false;
    }
    
    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
}