/**
 * 预测性记忆推理模块
 * 基于历史记忆预测下一步行动
 */

import { MemoryFragment, Prediction, PatternMatch, Suggestion } from '../interfaces/types.js';
import { layeredStorage } from './storage.js';

export class ReasoningEngine {
  
  /**
   * 查找相似记忆
   */
  async findSimilar(content: string, topK: number = 5): Promise<MemoryFragment[]> {
    const results = await layeredStorage.retrieve({
      query: content,
      limit: topK,
      minSignificance: 0.3
    });
    
    // 按相似度排序（简化版：按显著性）
    return results.sort((a, b) => b.significance - a.significance);
  }
  
  /**
   * 预测下一步行动
   */
  async predictNextAction(state: any): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    
    // 从记忆中查找相似状态
    const similarMemories = await this.findSimilar(JSON.stringify(state), 10);
    
    if (similarMemories.length === 0) {
      return predictions;
    }
    
    // 分析历史行动模式
    const actionCounts: Map<string, { count: number; successRate: number }> = new Map();
    
    for (const memory of similarMemories) {
      const content = memory.content;
      if (content.action) {
        const existing = actionCounts.get(content.action) || { count: 0, successRate: 0 };
        existing.count++;
        if (content.success) {
          existing.successRate = (existing.successRate * (existing.count - 1) + 1) / existing.count;
        }
        actionCounts.set(content.action, existing);
      }
    }
    
    // 生成预测
    for (const [action, stats] of actionCounts) {
      if (stats.count >= 2) {  // 至少出现2次
        predictions.push({
          action,
          confidence: stats.successRate,
          reason: `基于 ${stats.count} 次历史记录，成功率 ${(stats.successRate * 100).toFixed(0)}%`
        });
      }
    }
    
    // 按置信度排序
    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions.slice(0, 5);
  }
  
  /**
   * 获取决策建议
   */
  async suggest(context: any): Promise<Suggestion | null> {
    // 查找相似场景
    const similar = await this.findSimilar(JSON.stringify(context), 3);
    
    if (similar.length === 0) {
      return null;
    }
    
    // 取最相似的场景的建议
    const bestMatch = similar[0];
    
    if (bestMatch.content.suggestion) {
      return {
        type: bestMatch.content.suggestion.type || 'action',
        value: bestMatch.content.suggestion.value,
        confidence: bestMatch.significance,
        reasoning: `基于相似历史场景，置信度 ${(bestMatch.significance * 100).toFixed(0)}%`
      };
    }
    
    return null;
  }
  
  /**
   * 匹配模式
   */
  async matchPatterns(input: any): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    const memories = await layeredStorage.retrieve({
      query: input,
      type: 'symbol',
      limit: 10
    });
    
    for (const memory of memories) {
      matches.push({
        patternId: memory.id,
        similarity: memory.significance,
        matched: input,
        suggestion: memory.content
      });
    }
    
    return matches.sort((a, b) => b.similarity - a.similarity);
  }
  
  /**
   * 记录行动结果（供学习使用）
   */
  async recordActionResult(action: string, input: any, output: any, success: boolean): Promise<void> {
    await layeredStorage.store({
      action,
      input,
      output,
      success,
      timestamp: Date.now()
    }, success ? 0.7 : 0.3);
  }
}

export const reasoningEngine = new ReasoningEngine();