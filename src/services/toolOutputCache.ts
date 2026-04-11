import fs from 'fs/promises';
import path from 'path';

export interface ToolOutput {
  id: string;
  toolName: string;
  output: string;
  timestamp: number;
  important: boolean;
}

export class ToolOutputCache {
  private cache: Map<string, ToolOutput> = new Map();
  private cacheDir: string;
  
  constructor() {
    this.cacheDir = path.join(process.cwd(), '.toolcache');
  }
  
  // 判断输出是否重要
  isImportant(toolName: string, output: string): boolean {
    if (!output) return false;
    
    // grep 找到了匹配
    if (toolName === 'grep' && output.includes('找到') && output.includes('匹配')) {
      return true;
    }
    
    // 读取了关键文件（不截断的）
    if (toolName === 'read_file' && output.length > 0 && !output.includes('截断')) {
      return true;
    }
    
    // 文件编辑成功
    if (toolName === 'file_edit' && output.includes('成功编辑')) {
      return true;
    }
    
    // 写入成功
    if (toolName === 'write_file' && output.includes('成功写入')) {
      return true;
    }
    
    // 包含错误信息
    if (output.includes('Error') || output.includes('错误') || output.includes('失败')) {
      return true;
    }
    
    return false;
  }
  
  // 保存工具输出
  set(toolUseId: string, toolName: string, output: string): void {
    const important = this.isImportant(toolName, output);
    
    this.cache.set(toolUseId, {
      id: toolUseId,
      toolName,
      output: output.substring(0, 2000), // 限制长度
      timestamp: Date.now(),
      important
    });
    
    // 异步写入磁盘
    this.saveToDisk(toolUseId).catch(console.error);
  }
  
  // 获取所有重要输出
  getAllImportant(): ToolOutput[] {
    const important: ToolOutput[] = [];
    for (const item of this.cache.values()) {
      if (item.important) {
        important.push(item);
      }
    }
    // 按时间排序
    return important.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // 获取所有输出（用于调试）
  getAll(): ToolOutput[] {
    return Array.from(this.cache.values());
  }
  
  // 清理过期缓存（超过 1 小时）
  cleanExpired(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, item] of this.cache) {
      if (item.timestamp < oneHourAgo) {
        this.cache.delete(id);
      }
    }
  }
  
  // 清空
  clear(): void {
    this.cache.clear();
  }
  
  // 异步写入磁盘
  private async saveToDisk(id: string): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const item = this.cache.get(id);
      if (item) {
        const filePath = path.join(this.cacheDir, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(item, null, 2), 'utf-8');
      }
    } catch (error) {
      // 静默失败
    }
  }
}

export const toolOutputCache = new ToolOutputCache();