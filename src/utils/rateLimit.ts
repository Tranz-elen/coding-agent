export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly MAX_REQUESTS = 30;  // 每分钟最多 30 次
  private readonly WINDOW_MS = 60 * 1000;  // 1 分钟
  
  checkLimit(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= this.MAX_REQUESTS) {
      console.log(`⚠️ 速率限制：${key} 超过限制 (${this.MAX_REQUESTS}次/分钟)`);
      return false;
    }
    
    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
  
  // 获取当前使用量（用于调试）
  getUsage(key: string): number {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    const timestamps = this.requests.get(key) || [];
    return timestamps.filter(t => t > windowStart).length;
  }
}