import fs from 'fs/promises';
import path from 'path';
import { Message } from '../agent/types.js';

export interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class SessionManager {
  private sessionsDir: string;
  private currentSessionId: string | null = null;
  private sessions: Map<string, Session> = new Map();

  // 重命名会话
async renameSession(sessionId: string, newName: string): Promise<boolean> {
  const session = this.sessions.get(sessionId);
  if (!session) return false;
  
  session.name = newName;
  session.updatedAt = new Date();
  await this.saveSession(session);
  return true;
}

// 删除会话
async deleteSession(sessionId: string): Promise<boolean> {
  const session = this.sessions.get(sessionId);
  if (!session) return false;
  
  const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
  try {
    await fs.unlink(filePath);
    this.sessions.delete(sessionId);
    
    // 如果删除的是当前会话，清空当前会话引用
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    return true;
  } catch (error) {
    console.error('删除会话文件失败:', error);
    return false;
  }
}

// 获取会话详情
getSessionInfo(sessionId: string): Session | null {
  return this.sessions.get(sessionId) || null;
}
  
  constructor(baseDir: string = './sessions') {
    this.sessionsDir = path.resolve(process.cwd(), baseDir);
    this.init();
  }
  
  private async init(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await this.loadSessions();
    } catch (error) {
      console.error('初始化会话目录失败:', error);
    }
  }
  
  private async loadSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.sessionsDir, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            // 检查文件是否为空
          if (!content || content.trim() === '') {
            console.log(`⚠️ 跳过空文件: ${file}`);
            continue;
          }
            const session: Session = JSON.parse(content);
            session.createdAt = new Date(session.createdAt);
            session.updatedAt = new Date(session.updatedAt);
            this.sessions.set(session.id, session);
          } catch (err) {
            console.error(`加载会话文件失败 ${file}:`, err);
            // 备份损坏的文件
            try {
              const backupPath = filePath + '.corrupted';
              await fs.rename(filePath, backupPath);
              console.log(`已备份损坏文件到: ${backupPath}`);
            } catch (backupErr) {
              console.error('备份失败:', backupErr);
            }
          }
        }
      }
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  }
  
  async saveSession(session: Session): Promise<void> {
  const filePath = path.join(this.sessionsDir, `${session.id}.json`);
  // 使用 { encoding: 'utf-8' } 确保正确编码
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), { encoding: 'utf-8' });
  this.sessions.set(session.id, session);
}
  
  async loadSession(sessionId: string): Promise<Session | null> {
  // 先从内存中获取
  const cached = this.sessions.get(sessionId);
  if (cached) return cached;
  
  // 从文件读取
  const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const session: Session = JSON.parse(content);
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    
    // 修复乱码名称
    if (session.name && !session.name.includes('会话') && !session.name.includes('新')) {
      session.name = '会话';
    }
    
    this.sessions.set(session.id, session);
    return session;
  } catch (error) {
    console.error(`加载会话失败 ${sessionId}:`, error);
    return null;
  }
}
  
  async createSession(name: string, initialMessages: Message[] = []): Promise<Session> {
  // 确保名称是有效的中文
  const safeName = name || '新会话';
  
  const session: Session = {
    id: this.generateId(),
    name: safeName,
    messages: initialMessages,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await this.saveSession(session);
  this.currentSessionId = session.id;
  return session;
}
  
  async updateSession(sessionId: string, messages: Message[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = messages;
      session.updatedAt = new Date();
      await this.saveSession(session);
    }
  }
  
  
  listSessions(): Session[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  
  getCurrentSession(): Session | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }
  
  setCurrentSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.currentSessionId = sessionId;
      return true;
    }
    return false;
  }
  
  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const sessionManager = new SessionManager();