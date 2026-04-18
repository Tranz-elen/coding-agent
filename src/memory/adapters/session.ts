/**
 * 会话适配器
 * 替代原 session.ts，增强会话管理
 */

import { AgentInteraction } from '../interfaces/types.js';
import { cognitiveEvaluator } from '../core/cognitive.js';
import { layeredStorage } from '../core/storage.js';
import { reasoningEngine } from '../core/reasoning.js';
import { learningEngine } from '../core/learning.js';
import fs from 'fs/promises';
import path from 'path';

export interface SessionData {
  id: string;
  name: string;
  interactions: AgentInteraction[];
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
  keyPoints?: string[];
}

export class SessionMemoryAdapter {
  private sessionsDir: string;
  private memoryDir: string;
  
  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.memoryDir = path.join(this.sessionsDir, 'memory');
  }
  
  /**
   * 保存会话（增强版）
   */
  async saveSession(sessionId: string, interactions: AgentInteraction[]): Promise<void> {
    // 1. 认知评估：识别重要交互
    const significantInteractions: AgentInteraction[] = [];
    for (const interaction of interactions) {
        const score = await cognitiveEvaluator.evaluate(
    typeof interaction.content === 'string' ? interaction.content : JSON.stringify(interaction.content)
    );
    if (score.final > 0.6) {
    significantInteractions.push(interaction);
    }
    }
    
    // 2. 提取关键信息
    const keyPoints = this.extractKeyPoints(significantInteractions);
    const summary = this.generateSummary(significantInteractions);
    
    // 3. 存储到分层存储
    for (const interaction of significantInteractions) {
      await layeredStorage.store({
        type: 'session_interaction',
        sessionId,
        interaction,
        timestamp: Date.now()
      }, 0.7);
    }
    
    // 4. 保存会话摘要到记忆目录
    await fs.mkdir(this.memoryDir, { recursive: true });
    const summaryPath = path.join(this.memoryDir, `${sessionId}.json`);
    await fs.writeFile(summaryPath, JSON.stringify({
      id: sessionId,
      keyPoints,
      summary,
      interactionCount: interactions.length,
      significantCount: significantInteractions.length,
      updatedAt: new Date()
    }, null, 2));
    
    // 5. 保存完整会话（兼容原有格式）
    const sessionPath = path.join(this.sessionsDir, `${sessionId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify({
      id: sessionId,
      interactions,
      createdAt: new Date(),
      updatedAt: new Date()
    }, null, 2));
  }
  
  /**
   * 加载会话
   */
  async loadSession(sessionId: string): Promise<AgentInteraction[]> {
    const sessionPath = path.join(this.sessionsDir, `${sessionId}.json`);
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      const data = JSON.parse(content);
      return data.interactions || [];
    } catch {
      return [];
    }
  }
  
  /**
   * 获取会话摘要（增强版）
   */
  async getSessionSummary(sessionId: string): Promise<string> {
    const summaryPath = path.join(this.memoryDir, `${sessionId}.json`);
    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      const data = JSON.parse(content);
      return data.summary || '无摘要';
    } catch {
      // 如果没有摘要，从交互生成
      const interactions = await this.loadSession(sessionId);
      return this.generateSummary(interactions);
    }
  }
  
  /**
   * 获取会话关键点
   */
  async getSessionKeyPoints(sessionId: string): Promise<string[]> {
    const summaryPath = path.join(this.memoryDir, `${sessionId}.json`);
    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      const data = JSON.parse(content);
      return data.keyPoints || [];
    } catch {
      return [];
    }
  }
  
  /**
   * 跨会话关联
   */
  async linkSessions(sessionId1: string, sessionId2: string, reason: string): Promise<void> {
    const linkPath = path.join(this.memoryDir, 'links.json');
    let links: any[] = [];
    
    try {
      const content = await fs.readFile(linkPath, 'utf-8');
      links = JSON.parse(content);
    } catch {
      // 文件不存在，使用空数组
    }
    
    links.push({
      sessionId1,
      sessionId2,
      reason,
      timestamp: Date.now()
    });
    
    await fs.writeFile(linkPath, JSON.stringify(links, null, 2));
  }
  
  /**
   * 获取相关会话
   */
  async getRelatedSessions(sessionId: string): Promise<string[]> {
    const linkPath = path.join(this.memoryDir, 'links.json');
    try {
      const content = await fs.readFile(linkPath, 'utf-8');
      const links = JSON.parse(content);
      const related: string[] = [];
      for (const link of links) {
        if (link.sessionId1 === sessionId) {
          related.push(link.sessionId2);
        }
        if (link.sessionId2 === sessionId) {
          related.push(link.sessionId1);
        }
      }
      return [...new Set(related)];
    } catch {
      return [];
    }
  }
  
  /**
   * 提取关键点
   */
  private extractKeyPoints(interactions: AgentInteraction[]): string[] {
    const points: string[] = [];
    for (const interaction of interactions) {
      if (interaction.role === 'user') {
        const content = typeof interaction.content === 'string' ? interaction.content : '';
        if (content.includes('?') || content.includes('为什么')) {
          points.push(`用户提问: ${content.substring(0, 50)}`);
        }
      }
      if (interaction.role === 'tool') {
        const content = typeof interaction.content === 'string' ? interaction.content : '';
        if (content.includes('成功')) {
          points.push(`工具执行成功`);
        }
      }
    }
    return points.slice(0, 10);
  }
  
  /**
   * 生成摘要
   */
  private generateSummary(interactions: AgentInteraction[]): string {
    if (interactions.length === 0) return '空会话';
    
    const userMessages = interactions.filter(i => i.role === 'user');
    const toolExecutions = interactions.filter(i => i.role === 'tool');
    
    let summary = `会话包含 ${interactions.length} 条消息，`;
    summary += `其中用户消息 ${userMessages.length} 条，`;
    summary += `工具执行 ${toolExecutions.length} 次。`;
    
    return summary;
  }
}

export const sessionMemoryAdapter = new SessionMemoryAdapter();