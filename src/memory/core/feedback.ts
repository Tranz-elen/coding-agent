import { FeedbackSignal, AvoidPattern } from '../interfaces/types.js';
import { layeredStorage } from './storage.js';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger.js';

/**
 * 情绪反馈处理器
 */
export class FeedbackProcessor {
  private avoidZone: Map<string, AvoidPattern> = new Map();
  private avoidZonePath: string;
  
  // 正向情绪关键词
  private positivePatterns = [
    '很好', '不错', '棒', '对', '是的', '正确', '谢谢', '感谢', '厉害',
    '👍', 'good', 'great', 'nice', 'thanks', 'perfect', 'excellent'
  ];
  
  // 负向情绪关键词
  private negativePatterns = [
    '不对', '错了', '不是', '不好', '差', '错误', '不行', '糟糕','不喜欢', '别叫', '不要', '讨厌', '烦',
    '👎', 'wrong', 'bad', 'incorrect', 'no', 'not'
  ];
  
  constructor() {
    this.avoidZonePath = path.join(process.cwd(), 'sessions', 'memory', 'avoid_zone.json');
    this.loadAvoidZone();
  }
  
  private async loadAvoidZone(): Promise<void> {
    try {
      const content = await fs.readFile(this.avoidZonePath, 'utf-8');
      const data = JSON.parse(content);
      this.avoidZone = new Map(Object.entries(data));
      logger.feedback('避雷区加载完成:', this.avoidZone.size, '条');
    } catch {
      logger.feedback('未找到避雷区文件，使用空避雷区');
    }
  }
  
  private async saveAvoidZone(): Promise<void> {
    const data = Object.fromEntries(this.avoidZone);
    await fs.writeFile(this.avoidZonePath, JSON.stringify(data, null, 2));
  }
  
  /**
   * 分析用户输入，检测情绪反馈
   */
  analyzeFeedback(userInput: string, lastAgentResponse?: string): FeedbackSignal | null {
    const input = userInput.toLowerCase();
    
    // 先检测负向情绪
    const negativeMatch = this.negativePatterns.find(p => input.includes(p.toLowerCase()));
    if (negativeMatch) {
      return {
        type: 'negative',
        intensity: this.calculateIntensity(userInput, negativeMatch),
        relatedMemoryIds: [],
        reason: `用户表达了负向反馈: "${negativeMatch}"`,
        timestamp: Date.now()
      };
    }
    
    // 再检测正向情绪
    const positiveMatch = this.positivePatterns.find(p => input.includes(p.toLowerCase()));
    if (positiveMatch) {
      return {
        type: 'positive',
        intensity: this.calculateIntensity(userInput, positiveMatch),
        relatedMemoryIds: [],
        reason: `用户表达了正向反馈: "${positiveMatch}"`,
        timestamp: Date.now()
      };
    }
    
    return null;
  }
  
  /**
   * 计算情绪强度
   */
  private calculateIntensity(text: string, match: string): number {
    let intensity = 0.5;
    
    if (text.includes('！') || text.includes('!')) {
      intensity += 0.2;
    }
    
    if (text.includes(match + match) || text.includes(match + ' ' + match)) {
      intensity += 0.2;
    }
    
    if (text === text.toUpperCase() && text.length > 2) {
      intensity += 0.1;
    }
    
    return Math.min(intensity, 1.0);
  }
  
  /**
   * 处理正向反馈：给相关记忆加分
   */
  async handlePositive(feedback: FeedbackSignal): Promise<void> {
    if (feedback.relatedMemoryIds.length === 0) return;
    
    const boostAmount = feedback.intensity * 0.2;
    
    for (const id of feedback.relatedMemoryIds) {
      await layeredStorage.boostSignificance(id, boostAmount);
    }
    
    logger.feedback('正向反馈处理完成:', {
      count: feedback.relatedMemoryIds.length,
      boost: boostAmount
    });
  }
  
  /**
   * 处理负向反馈：添加到避雷区
   */
  async handleNegative(feedback: FeedbackSignal, userInput: string, lastAgentResponse?: string): Promise<void> {
    let pattern: string;
    
    if (lastAgentResponse) {
      pattern = this.extractNegatedPattern(lastAgentResponse, userInput);
    } else {
      pattern = this.extractPattern(userInput);
    }
    
    const avoidPattern: AvoidPattern = {
      id: this.generateId(),
      pattern,
      reason: feedback.reason,
      intensity: feedback.intensity,
      createdAt: Date.now(),
      matchCount: 1
    };
    
    this.avoidZone.set(avoidPattern.id, avoidPattern);
    await this.saveAvoidZone();
    
    logger.feedback('负向反馈已添加到避雷区并保存:', avoidPattern);
  }
  
  /**
   * 从被否定的 Agent 回复中提取避雷模式
   */
  private extractNegatedPattern(agentResponse: string, userCorrection: string): string {
    // 1. 提取 Agent 回复中的名字 vs 用户纠正中的名字
    const agentNameMatch = agentResponse.match(/你叫[：:\s]*([^\s，。.!！?？]+)/);
    const correctionNameMatch = userCorrection.match(/叫[：:\s]*([^\s，。.!！?？]+)/);
    
    if (agentNameMatch && correctionNameMatch && agentNameMatch[1] !== correctionNameMatch[1]) {
      logger.feedback('避雷区提取: 被否定的名字 =', agentNameMatch[1]);
      return agentNameMatch[1];
    }
    
    // 2. 其他否定模式
    const negationMatch = userCorrection.match(/(?:不是|不对|错了)[：:\s]*([^\s，。.!！?？]+)/);
    if (negationMatch) {
      logger.feedback('避雷区提取: 被否定的内容 =', negationMatch[1]);
      return negationMatch[1];
    }
    
    // 3. 兜底：返回 Agent 回复的前 30 个字符
    logger.feedback('避雷区提取: 使用兜底模式');
    return agentResponse.substring(0,30);
  }
  
  /**
   * 提取关键短语
   */
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];
    
    const quoteMatch = text.match(/[""]([^""]+)[""]/g);
    if (quoteMatch) {
      phrases.push(...quoteMatch.map(q => q.replace(/[""]/g, '')));
    }
    
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g);
    if (chineseWords) {
      const stopWords = ['什么', '怎么', '为什么', '这个', '那个', '我们', '你们', '他们'];
      const filtered = chineseWords.filter(w => !stopWords.includes(w));
      phrases.push(...filtered);
    }
    
    const englishWords = text.match(/[A-Z][a-z]+|[a-z]+/g);
    if (englishWords) {
      phrases.push(...englishWords);
    }
    
    return [...new Set(phrases)];
  }
  
  /**
   * 提取模式（兜底）
   */
  private extractPattern(text: string): string {
    return text.substring(0, 100);
  }
  
  /**
   * 检查内容是否命中避雷区
   */
  matchAvoidZone(content: string): { matched: boolean; reason?: string; intensity?: number } {
    for (const pattern of this.avoidZone.values()) {
      if (content.includes(pattern.pattern) || pattern.pattern.includes(content.substring(0, 30))) {
        pattern.lastMatched = Date.now();
        pattern.matchCount++;
        this.saveAvoidZone();
        return {
          matched: true,
          reason: pattern.reason,
          intensity: pattern.intensity
        };
      }
    }
    return { matched: false };
  }
  
  /**
   * 关联最近的 Agent 回复
   */
  async linkToLastResponse(feedback: FeedbackSignal, lastResponseId?: string): Promise<void> {
    if (lastResponseId) {
      feedback.relatedMemoryIds = [lastResponseId];
    }
  }
  
  private generateId(): string {
    return `avoid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  
  /**
   * 获取避雷区统计
   */
  getAvoidZoneStats(): { total: number; patterns: AvoidPattern[] } {
    const patterns = Array.from(this.avoidZone.values());
    return {
      total: patterns.length,
      patterns: patterns.sort((a, b) => b.matchCount - a.matchCount)
    };
  }
}

export const feedbackProcessor = new FeedbackProcessor();