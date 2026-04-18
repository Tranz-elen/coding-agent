/**
 * 认知显著性评估模块
 * 评估信息的重要性，决定存储层级
 */

import { CognitiveScore, EvaluationContext } from '../interfaces/types.js';
import { layeredStorage } from './storage.js';

export class CognitiveEvaluator {
  /**
   * 综合评估信息的重要性
   */
  async evaluate(content: string, context?: EvaluationContext): Promise<CognitiveScore> {
    const entropy = this.calculateEntropy(content);
    const novelty = await this.detectNovelty(content);
    const relevance = this.assessRelevance(content, context);
    const userSignal = this.detectUserSignal(content);
    
    // 加权计算最终得分
    const final = 
      entropy * 0.25 +
      novelty * 0.25 +
      relevance * 0.25 +
      userSignal * 0.25;
    
    return { entropy, novelty, relevance, userSignal, final };
  }
  
  /**
   * 信息熵：内容越丰富，熵越高
   */
  calculateEntropy(content: string): number {
  if (!content || content.length === 0) return 0;
  
  // 1. 长度得分（200字满分）
  const lengthScore = Math.min(content.length / 200, 1);
  
  // 2. 词汇多样性（30个不同词满分）
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const diversityScore = Math.min(uniqueWords / 30, 1);
  
  // 3. 语义复杂度（关键词深度）
  const complexKeywords = [
    '架构', '设计', '算法', '系统', '原理',
    '学习', '规划', '能力', '提升', '创作',
    '分析', '优化', '修复', '开发', '实现'
  ];
  let complexScore = 0;
  for (const kw of complexKeywords) {
    if (content.includes(kw)) complexScore += 0.1;
  }
  complexScore = Math.min(complexScore, 0.5);
  
  // 4. 问题复杂度
  let questionScore = 0;
  if (content.includes('？') || content.includes('?')) questionScore += 0.2;
  if (content.includes('如何') || content.includes('怎么')) questionScore += 0.2;
  if (content.includes('为什么')) questionScore += 0.2;
  questionScore = Math.min(questionScore, 0.5);
  
  // 综合得分
  return (lengthScore + diversityScore + complexScore + questionScore) / 3;
}
  
  /**
   * 新颖性：与存储层对比
   */
  async detectNovelty(content: any): Promise<number> {  // 👈 参数改为 any
  // 确保 content 是字符串
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  
  // 从存储层检索相似内容
  const similar = await layeredStorage.retrieve({
    query: contentStr,  // 👈 使用转换后的字符串
    limit: 5,
    minSignificance: 0
  });
  
  // 没有相似内容 → 全新，新颖性高
  if (similar.length === 0) {
    return 0.9;
  }
  
  // 计算平均相似度
  let totalSimilarity = 0;
  for (const item of similar) {
    // 获取记忆内容的字符串形式
    const itemContent = typeof item.content === 'string' 
      ? item.content 
      : JSON.stringify(item.content);
    
    const sim = this.calculateSimilarity(contentStr, itemContent);  // 👈 直接用 contentStr
    totalSimilarity += sim;
  }
  const avgSimilarity = totalSimilarity / similar.length;
  
  // 新颖性 = 1 - 平均相似度
  return 1 - avgSimilarity;
}
  
  /**
   * 计算两个文本的相似度
   */
 private calculateSimilarity(a: any, b: any): number {
  // 确保都是字符串
  const strA = typeof a === 'string' ? a : JSON.stringify(a);
  const strB = typeof b === 'string' ? b : JSON.stringify(b);
  
  const wordsA = new Set(strA.toLowerCase().split(/\s+/));
  const wordsB = new Set(strB.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
  
  /**
   * 从存储内容中提取文本
   */
  private getContentText(content: any): string {
    if (typeof content === 'string') return content;
    if (content.content) return content.content;
    if (content.input) return content.input;
    return JSON.stringify(content);
  }
  
  /**
   * 相关性：与当前任务的相关程度
   */
  assessRelevance(content: string, context?: EvaluationContext): number {
    // 关键词匹配
    const keywords = ['错误', 'error', '修复', 'fix', '问题', 'problem', '重要', 'important'];
    let score = 0;
    for (const kw of keywords) {
      if (content.toLowerCase().includes(kw)) {
        score += 0.2;
      }
    }
    return Math.min(score, 1);
  }
  
  /**
   * 用户信号：用户追问、确认、纠正
   */
  detectUserSignal(content: string): number {
    const signals = ['?', '为什么', '怎么', '如何', '不对', '错误', 'again', '重新'];
    let score = 0;
    for (const sig of signals) {
      if (content.includes(sig)) {
        score += 0.25;
      }
    }
    return Math.min(score, 1);
  }
  
  /**
   * 评估工具结果的重要性
   */
  evaluateToolResult(success: boolean, outputLength: number): number {
    let score = 0;
    if (success) score += 0.5;
    score += Math.min(outputLength / 1000, 0.5);
    return score;
  }
}

export const cognitiveEvaluator = new CognitiveEvaluator();