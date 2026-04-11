import fs from 'fs/promises';
import path from 'path';
import { Message } from '../agent/types.js';

export interface SessionSummary {
  sessionId: string;
  summary: string;
  keyInfo: {
    completedWork: string[];
    currentStatus: string[];
    pendingTasks: string[];
    modifiedFiles: string[];
    errors: string[];
    decisions: string[];
  };
  timestamp: number;
  messageCount: number;
}

export class SessionSummaryService {
  private summariesDir: string;
  
  constructor() {
    this.summariesDir = path.join(process.cwd(), '.summaries');
  }
  
  // 保存会话摘要
  async saveSummary(sessionId: string, summary: SessionSummary): Promise<void> {
    try {
      await fs.mkdir(this.summariesDir, { recursive: true });
      const filePath = path.join(this.summariesDir, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(summary, null, 2), 'utf-8');
      console.log(`📝 保存会话摘要: ${sessionId.slice(-8)}`);
    } catch (error) {
      console.error(`保存摘要失败: ${error}`);
    }
  }
  
  // 加载会话摘要
  async loadSummary(sessionId: string): Promise<SessionSummary | null> {
    try {
      const filePath = path.join(this.summariesDir, `${sessionId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  // 列出所有摘要
  async listSummaries(): Promise<SessionSummary[]> {
    try {
      const files = await fs.readdir(this.summariesDir);
      const summaries: SessionSummary[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.summariesDir, file), 'utf-8');
          summaries.push(JSON.parse(content));
        }
      }
      return summaries.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
  
  // 清理过期摘要（超过 7 天）
  async cleanExpired(maxAgeDays: number = 7): Promise<void> {
    try {
      const files = await fs.readdir(this.summariesDir);
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        const filePath = path.join(this.summariesDir, file);
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
        }
      }
    } catch {
      // 目录不存在，忽略
    }
  }
}

export const sessionSummary = new SessionSummaryService();