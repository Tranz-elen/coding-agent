/**
 * 压缩适配器
 * 增强上下文压缩，集成记忆系统
 */

import { AgentInteraction, CompressedContext } from '../interfaces/types.js';
import { cognitiveEvaluator } from '../core/cognitive.js';
import { layeredStorage } from '../core/storage.js';
import { reasoningEngine } from '../core/reasoning.js';

export class CompressionAdapter {
  
  /**
   * 智能压缩上下文
   */
  async compress(
    interactions: AgentInteraction[], 
    maxTokens: number,
    sessionId?: string
  ): Promise<CompressedContext> {
    // 1. 认知评估：识别重要交互
    const scoredInteractions = await this.evaluateInteractions(interactions);
    
    // 2. 按重要性排序
    const sorted = [...scoredInteractions].sort((a, b) => b.score - a.score);
    
    // 3. 选择重要交互（直到接近 token 限制）
    const selected: AgentInteraction[] = [];
    let currentTokens = 0;
    
    for (const item of sorted) {
      const itemTokens = this.estimateTokens(item.interaction);
      if (currentTokens + itemTokens <= maxTokens) {
        selected.push(item.interaction);
        currentTokens += itemTokens;
      } else {
        break;
      }
    }
    
    // 4. 补充相关记忆
    const relevantMemories = await this.getRelevantMemories(selected, sessionId);
    
    // 5. 生成摘要
    const summary = await this.generateSummary(selected);
    const keyPoints = this.extractKeyPoints(selected);
    
    // 6. 存储压缩结果到记忆
    await layeredStorage.store({
      type: 'compression',
      sessionId,
      originalCount: interactions.length,
      compressedCount: selected.length,
      keyPoints,
      summary,
      timestamp: Date.now()
    }, 0.5);
    
    return {
      summary,
      keyPoints,
      relevantMemories,
      tokenCount: currentTokens
    };
  }
  
  /**
   * 评估交互重要性
   */
  private async evaluateInteractions(
    interactions: AgentInteraction[]
  ): Promise<Array<{ interaction: AgentInteraction; score: number }>> {
    const results = [];
    
    for (const interaction of interactions) {
      const content = typeof interaction.content === 'string' 
        ? interaction.content 
        : JSON.stringify(interaction.content);
        
      const score = await cognitiveEvaluator.evaluate(content);
      
      // 工具执行结果权重更高
      let finalScore = score.final;
      if (interaction.role === 'tool') {
        finalScore *= 1.2;
      }
      if (interaction.role === 'user') {
        finalScore *= 1.1;
      }
      
      results.push({
        interaction,
        score: Math.min(finalScore, 1)
      });
    }
    
    return results;
  }
  
  /**
   * 获取相关记忆
   */
  private async getRelevantMemories(
    interactions: AgentInteraction[],
    sessionId?: string
  ): Promise<any[]> {
    if (interactions.length === 0) return [];
    
    // 取最后一条交互作为查询
    const lastInteraction = interactions[interactions.length - 1];
    const query = typeof lastInteraction.content === 'string'
      ? lastInteraction.content
      : JSON.stringify(lastInteraction.content);
    
    // 检索相关记忆
    const memories = await layeredStorage.retrieve({
      query,
      limit: 5,
      minSignificance: 0.5
    });
    
    return memories;
  }
  
  /**
   * 生成摘要
   */
  private async generateSummary(interactions: AgentInteraction[]): Promise<string> {
    if (interactions.length === 0) {
      return '无重要内容';
    }
    
    const userMessages = interactions.filter(i => i.role === 'user');
    const assistantMessages = interactions.filter(i => i.role === 'assistant');
    const toolExecutions = interactions.filter(i => i.role === 'tool');
    
    let summary = `📋 对话摘要\n\n`;
    summary += `- 用户消息: ${userMessages.length} 条\n`;
    summary += `- Agent响应: ${assistantMessages.length} 条\n`;
    summary += `- 工具执行: ${toolExecutions.length} 次\n`;
    
    // 添加关键主题
    const topics = this.extractTopics(interactions);
    if (topics.length > 0) {
      summary += `- 关键主题: ${topics.join(', ')}\n`;
    }
    
    return summary;
  }
  
  /**
   * 提取关键点
   */
  private extractKeyPoints(interactions: AgentInteraction[]): string[] {
    const points: string[] = [];
    
    for (const interaction of interactions) {
      if (interaction.role === 'user') {
        const content = typeof interaction.content === 'string' ? interaction.content : '';
        if (content.includes('修复') || content.includes('fix')) {
          points.push(`用户请求修复问题`);
        }
        if (content.includes('创建') || content.includes('create')) {
          points.push(`用户请求创建内容`);
        }
      }
      
      if (interaction.role === 'tool') {
        const content = typeof interaction.content === 'string' ? interaction.content : '';
        if (content.includes('成功')) {
          points.push(`工具执行成功`);
        }
        if (content.includes('失败')) {
          points.push(`工具执行失败`);
        }
      }
    }
    
    // 去重
    return [...new Set(points)];
  }
  
  /**
   * 提取主题
   */
  private extractTopics(interactions: AgentInteraction[]): string[] {
    const topics: string[] = [];
    const keywords = ['蛇', '游戏', '文件', '代码', '修复', '创建', '读取', '写入'];
    
    for (const interaction of interactions) {
      const content = typeof interaction.content === 'string' ? interaction.content : '';
      for (const kw of keywords) {
        if (content.includes(kw) && !topics.includes(kw)) {
          topics.push(kw);
        }
      }
    }
    
    return topics.slice(0, 5);
  }
  
  /**
   * 估算 token 数
   */
  private estimateTokens(interaction: AgentInteraction): number {
    const content = typeof interaction.content === 'string'
      ? interaction.content
      : JSON.stringify(interaction.content);
    return Math.ceil(content.length / 2);
   
  }

  
  /**
   * 判断是否需要压缩
   */
  async needsCompression(interactions: AgentInteraction[], maxTokens: number): Promise<boolean> {
    let totalTokens = 0;
    for (const interaction of interactions) {
      totalTokens += this.estimateTokens(interaction);
      if (totalTokens > maxTokens) {
        return true;
      }
    }
    return false;
  }
}

export const compressionAdapter = new CompressionAdapter();