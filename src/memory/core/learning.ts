/**
 * 决策进化学习模块
 * 从结果中学习，优化决策
 */

import { Feedback, DecisionFeedback } from '../interfaces/types.js';
import { layeredStorage } from './storage.js';
import { reasoningEngine } from './reasoning.js';

export class LearningEngine {
  // 决策权重
  private weights: Map<string, number> = new Map();
  
  // 成功/失败统计
  private stats: { success: number; failure: number; total: number } = {
    success: 0,
    failure: 0,
    total: 0
  };
  
  /**
   * 接收结果反馈
   */
  async receiveFeedback(feedback: Feedback): Promise<void> {
    // 更新统计
    this.stats.total++;
    if (feedback.outcome === 'success') {
      this.stats.success++;
    } else if (feedback.outcome === 'failure') {
      this.stats.failure++;
    }
    
    // 存储反馈到记忆
    await layeredStorage.store({
      type: 'feedback',
      outcome: feedback.outcome,
      score: feedback.score,
      details: feedback.details,
      timestamp: Date.now()
    }, feedback.score / 100);
    
    // 触发学习
    await this.updateWeights(feedback);
  }
  
  /**
   * 从决策结果学习
   */
  async learnFromOutcome(feedback: DecisionFeedback): Promise<void> {
    // 更新决策权重
    const currentWeight = this.weights.get(feedback.action) || 0.5;
    let newWeight = currentWeight;
    
    if (feedback.actualOutcome === feedback.expectedOutcome) {
      // 预测正确，增加权重
      newWeight = Math.min(1, currentWeight + 0.05);
    } else {
      // 预测错误，降低权重
      newWeight = Math.max(0, currentWeight - 0.05);
    }
    
    this.weights.set(feedback.action, newWeight);
    
    // 存储学习结果
    await layeredStorage.store({
      type: 'learning',
      action: feedback.action,
      oldWeight: currentWeight,
      newWeight: newWeight,
      timestamp: Date.now()
    }, Math.abs(newWeight - currentWeight));
  }
  
  /**
   * 更新决策权重
   */
  private async updateWeights(feedback: Feedback): Promise<void> {
    // 根据反馈调整权重
    const adjustment = feedback.outcome === 'success' ? 0.02 : -0.02;
    
    for (const [action, weight] of this.weights) {
      const newWeight = Math.max(0, Math.min(1, weight + adjustment));
      this.weights.set(action, newWeight);
    }
  }
  
  /**
   * 获取决策权重
   */
  getWeight(action: string): number {
    return this.weights.get(action) || 0.5;
  }
  
  /**
   * 遗忘机制：降低低频记忆权重
   */
  async decay(): Promise<void> {
    // 获取所有记忆
    const memories = await layeredStorage.retrieve({
      query: {},
      limit: 1000
    });
    
    const now = Date.now();
    let decayCount = 0;
    
    for (const memory of memories) {
      const age = now - memory.timestamp;
      const ageDays = age / (24 * 60 * 60 * 1000);
      
      if (ageDays > 30) {
        // 超过30天，降低显著性
        const newSignificance = memory.significance * 0.9;
        if (newSignificance < 0.1) {
          // 过于陈旧，可考虑删除（由 storage 的 cleanup 处理）
          decayCount++;
        }
      }
    }
    
    // 清理过期记忆
    const cleaned = await layeredStorage.cleanup(30);
    
    console.log(`[Learning] 遗忘: ${decayCount} 条记忆衰减, ${cleaned} 条已清理`);
  }
  
  /**
   * 获取学习统计
   */
  getStats(): { success: number; failure: number; total: number; accuracy: number } {
    const accuracy = this.stats.total > 0 
      ? this.stats.success / this.stats.total 
      : 0;
    
    return {
      success: this.stats.success,
      failure: this.stats.failure,
      total: this.stats.total,
      accuracy
    };
  }
  
  /**
   * 重置学习状态
   */
  reset(): void {
    this.weights.clear();
    this.stats = { success: 0, failure: 0, total: 0 };
  }
}

export const learningEngine = new LearningEngine();