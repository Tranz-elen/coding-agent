import { Message } from '../agent/types.js';

interface CachedFile {
  path: string;
  content: string;
  timestamp: number;
  messageId: string;  // 关联的消息 ID
}

export class FileCache {
  private cache: Map<string, CachedFile> = new Map();
  private maxSize: number = 50;  // 最多缓存 50 个文件
  
  // 缓存文件内容
  set(filePath: string, content: string, messageId: string): void {
    // 限制缓存大小
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的
      const oldest = [...this.cache.values()].sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) this.cache.delete(oldest.path);
    }
    
    this.cache.set(filePath, {
      path: filePath,
      content,
      timestamp: Date.now(),
      messageId
    });
  }
  
  // 获取缓存的文件内容
  get(filePath: string): string | null {
    const cached = this.cache.get(filePath);
    if (cached) {
      // 更新访问时间
      cached.timestamp = Date.now();
      return cached.content;
    }
    return null;
  }
  
  // 检查是否有缓存
  has(filePath: string): boolean {
    return this.cache.has(filePath);
  }
  
  // 清理过期缓存（超过 1 小时）
  cleanExpired(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [path, cached] of this.cache) {
      if (cached.timestamp < oneHourAgo) {
        this.cache.delete(path);
      }
    }
  }
  
  // 获取缓存统计
  getStats(): { size: number; files: string[] } {
    return {
      size: this.cache.size,
      files: [...this.cache.keys()]
    };
  }
}

export const fileCache = new FileCache();