import {
  MemoryFragment,
  MemoryQuery,
  Prediction,
  Suggestion,
  Feedback,
  DecisionFeedback,
  AgentInteraction,
  ToolExecutionResult,
  CompressedContext,
  CognitiveScore,
  EvaluationContext
} from './types.js';

/**
 * 记忆系统核心接口
 */
export interface IMemorySystem {
  // ============================================================
  // 认知评估
  // ============================================================
  
  /** 评估信息的重要性 */
  evaluate(interaction: AgentInteraction, context?: EvaluationContext): Promise<CognitiveScore>;
  
  /** 评估工具结果的重要性 */
  evaluateToolResult(result: ToolExecutionResult): Promise<number>;
  
  // ============================================================
  // 存储
  // ============================================================
  
  /** 存储交互 */
  storeInteraction(interaction: AgentInteraction): Promise<string>;
  
  /** 存储工具结果 */
  storeToolResult(result: ToolExecutionResult): Promise<string>;
  
  /** 批量存储 */
  storeBatch(items: AgentInteraction[]): Promise<string[]>;
  
  // ============================================================
  // 检索
  // ============================================================
  
  /** 检索相关记忆 */
  retrieve(query: MemoryQuery): Promise<MemoryFragment[]>;
  
  /** 获取上下文记忆 */
  getContextualMemories(context: AgentInteraction[], limit?: number): Promise<MemoryFragment[]>;
  
  // ============================================================
  // 推理
  // ============================================================
  
  /** 预测下一步行动 */
  predictNextAction(state: any): Promise<Prediction[]>;
  
  /** 获取决策建议 */
  suggest(context: AgentInteraction[]): Promise<Suggestion | null>;
  
  // ============================================================
  // 学习
  // ============================================================
  
  /** 接收反馈 */
  receiveFeedback(feedback: Feedback): Promise<void>;
  
  /** 从决策结果学习 */
  learnFromOutcome(feedback: DecisionFeedback): Promise<void>;
  
  // ============================================================
  // 上下文管理
  // ============================================================
  
  /** 获取压缩上下文 */
  getCompressedContext(interactions: AgentInteraction[], maxTokens: number): Promise<CompressedContext>;
  
  /** 更新上下文 */
  updateContext(newInteractions: AgentInteraction[]): Promise<void>;
  
  // ============================================================
  // 管理
  // ============================================================
  
  /** 清理过期记忆 */
  cleanup(maxAge?: number): Promise<number>;
  
  /** 获取统计信息 */
  getStats(): Promise<MemoryStats>;
}

export interface MemoryStats {
  totalFragments: number;
  byType: Record<string, number>;
  avgSignificance: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}