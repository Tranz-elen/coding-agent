import fs from 'fs/promises';
import path from 'path';

interface CachedFile {
  path: string;
  content: string;
  timestamp: number;
  messageId: string;
}

export class FileCache {
  private cache: Map<string, CachedFile> = new Map();
  private maxSize: number = 50;
  
  // 获取缓存目录
  private getCacheDir(): string {
    return path.join(process.cwd(), '.cache');
  }
  
  // 生成文件路径的哈希作为文件名
  private getHash(filePath: string): string {
    return Buffer.from(filePath).toString('base64').replace(/[\/=+]/g, '_');
  }
  
  // 写入缓存（同时写内存和磁盘）
  async set(filePath: string, content: string, messageId: string): Promise<void> {
     console.log(`[DEBUG] fileCache.set 被调用: ${filePath}`);
    // 内存缓存
    if (this.cache.size >= this.maxSize) {
      const oldest = [...this.cache.values()].sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) this.cache.delete(oldest.path);
    }
    
    this.cache.set(filePath, {
      path: filePath,
      content,
      timestamp: Date.now(),
      messageId
    });
    
    // 磁盘缓存
    try {
      const cacheDir = this.getCacheDir();
      console.log(`[DEBUG] 缓存目录: ${cacheDir}`);
      await fs.mkdir(cacheDir, { recursive: true });
      const hash = this.getHash(filePath);
      const cacheFile = path.join(cacheDir, hash);
      console.log(`[DEBUG] 写入缓存文件: ${cacheFile}`);
      await fs.writeFile(cacheFile, content, 'utf-8');
      console.log(`[DEBUG] 写入成功`);
    } catch (error) {
       console.error(`[DEBUG] 写入失败:`, error);
    }
  }
  
  // 从内存获取
  get(filePath: string): string | null {
    const cached = this.cache.get(filePath);
    if (cached) {
      cached.timestamp = Date.now();
      return cached.content;
    }
    return null;
  }
  
  // 从磁盘获取
  async getFromDisk(filePath: string): Promise<string | null> {
    try {
      const cacheDir = this.getCacheDir();
      const hash = this.getHash(filePath);
      const content = await fs.readFile(path.join(cacheDir, hash), 'utf-8');
      return content;
    } catch {
      return null;
    }
  }
  
  // 获取所有磁盘缓存文件
  async getAllDiskCaches(): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    try {
      const cacheDir = this.getCacheDir();
      const files = await fs.readdir(cacheDir);
      for (const file of files) {
        const content = await fs.readFile(path.join(cacheDir, file), 'utf-8');
        // 无法从哈希反推原路径，用哈希作为 key
        result.set(file, content);
      }
    } catch {
      // 目录不存在
    }
    return result;
  }
  
// 清理过期缓存（超过 N 天）
async cleanExpiredCache(maxAgeDays: number = 7): Promise<number> {
  const cacheDir = this.getCacheDir();
  let cleanedCount = 0;
  
  try {
    const files = await fs.readdir(cacheDir);
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.unlink(filePath);
        cleanedCount++;
      }
    }
    
    console.log(`🧹 清理了 ${cleanedCount} 个过期缓存文件（超过 ${maxAgeDays} 天）`);
  } catch (error) {
    console.log(`⚠️ 清理缓存失败: ${error}`);
  }
  
  return cleanedCount;
}

// 限制缓存总大小（超过 maxSizeMB 时删除最旧的）
async limitCacheSize(maxSizeMB: number = 100): Promise<number> {
  const cacheDir = this.getCacheDir();
  let cleanedCount = 0;
  
  try {
    const files = await fs.readdir(cacheDir);
    const fileInfos = [];
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stat = await fs.stat(filePath);
      fileInfos.push({ path: filePath, size: stat.size, mtime: stat.mtimeMs });
      totalSize += stat.size;
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (totalSize > maxSizeBytes) {
      // 按修改时间排序，最旧的在前
      fileInfos.sort((a, b) => a.mtime - b.mtime);
      
      let freedSize = 0;
      for (const info of fileInfos) {
        if (totalSize - freedSize <= maxSizeBytes) break;
        await fs.unlink(info.path);
        freedSize += info.size;
        cleanedCount++;
      }
      
      console.log(`🧹 缓存大小超限 (${(totalSize / 1024 / 1024).toFixed(1)}MB > ${maxSizeMB}MB)，清理了 ${cleanedCount} 个文件，释放 ${(freedSize / 1024 / 1024).toFixed(1)}MB`);
    }
  } catch (error) {
    console.log(`⚠️ 限制缓存大小失败: ${error}`);
  }
  
  return cleanedCount;
}

  has(filePath: string): boolean {
    return this.cache.has(filePath);
  }
  
  cleanExpired(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [path, cached] of this.cache) {
      if (cached.timestamp < oneHourAgo) {
        this.cache.delete(path);
      }
    }
  }


  
  getStats(): { size: number; files: string[] } {
    return {
      size: this.cache.size,
      files: [...this.cache.keys()]
    };
  }
}

export const fileCache = new FileCache();