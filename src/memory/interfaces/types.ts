/**
 * 记忆系统核心类型定义
 */

// ============================================================
// 认知评估相关
// ============================================================

export interface CognitiveScore {
  entropy: number;      // 信息熵（0-1）
  novelty: number;      // 新颖性（0-1）
  relevance: number;    // 相关性（0-1）
  userSignal: number;   // 用户信号（0-1）
  final: number;        // 综合得分
}

export interface EvaluationContext {
  historyLength: number;
  sessionId?: string;
  agentId?: string;
}

// ============================================================
// 记忆存储相关
// ============================================================

export type MemoryType = 'instance' | 'feature' | 'symbol';

export interface MemoryFragment {
  id: string;
  content: any;
  significance: number;
  timestamp: number;
  type: MemoryType;
  links: string[];        // 关联的其他记忆ID
  metadata?: Record<string, any>;

   // 👇 新增字段
  status?: 'active' | 'deprecated' | 'superseded';
  supersededBy?: string;  // 被哪个新记忆取代
  embedding?: number[];  // 向量表示
}

export interface MemoryQuery {
  query: any;
  type?: MemoryType;
  minSignificance?: number;
  limit?: number;
  similarity?: number;
}
// 反馈信号
export interface FeedbackSignal {
  type: 'positive' | 'negative' | 'neutral';
  intensity: number;           // 0-1
  relatedMemoryIds: string[];  // 关联的记忆ID
  reason: string;              // 检测原因
  timestamp: number;
}

// 避雷区条目
export interface AvoidPattern {
  id: string;
  pattern: string;             // 要避免的内容模式
  reason: string;
  intensity: number;           // 避免强度 0-1
  createdAt: number;
  lastMatched?: number;
  matchCount: number;
}

// ============================================================
// 推理相关
// ============================================================

export interface Prediction {
  action: string;
  confidence: number;
  reason: string;
  parameters?: Record<string, any>;
}

export interface PatternMatch {
  patternId: string;
  similarity: number;
  matched: any;
  suggestion?: any;
}

export interface Suggestion {
  type: 'tool' | 'parameter' | 'action';
  value: any;
  confidence: number;
  reasoning: string;
}

// ============================================================
// 学习相关
// ============================================================

export interface Feedback {
  outcome: 'success' | 'failure' | 'partial';
  score: number;
  details: any;
  timestamp: number;
}

export interface DecisionFeedback {
  action: string;
  expectedOutcome: string;
  actualOutcome: string;
  score: number;
}

// ============================================================
// 适配器相关
// ============================================================

export interface AgentInteraction {
  role: 'user' | 'assistant' | 'tool' | 'system';  // 添加 'system'
  content: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ToolExecutionResult {
  toolName: string;
  input: any;
  output: any;
  success: boolean;
  duration: number;
  timestamp: number;
}

export interface CompressedContext {
  summary: string;
  keyPoints: string[];
  relevantMemories: MemoryFragment[];
  tokenCount: number;
}

export interface FeedbackSignal {
  type: 'positive' | 'negative' | 'neutral';
  intensity: number;
  relatedMemoryIds: string[];
  reason: string;
  timestamp: number;
}

export interface AvoidPattern {
  id: string;
  pattern: string;
  reason: string;
  intensity: number;
  createdAt: number;
  lastMatched?: number;
  matchCount: number;
}

// ========== 任务记忆相关 ==========

export interface TaskStep {
  id: string;
  content: string;               // 步骤描述，如"淘米"
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'failed';
  instanceId?: string;           // 关联的实例层记忆ID（具体方法）
  expectedOutput?: string;       // 预期结果
  actualOutput?: string;         // 实际结果
  order: number;                 // 步骤顺序
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;                 // 任务标题，如"煮饭"
  description: string;           // 任务描述
  goal: string;                  // 任务目标
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  steps: TaskStep[];             // 步骤列表
  currentStepIndex: number;      // 当前执行到第几步
  significance: number;          // 任务权重（0-1）
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  context?: string;              // 原始上下文（LLM生成的完整规划）
  tags?: string[];               // 标签，如["烹饪", "厨房"]
  memoryIds?: string[];          // 关联的其他记忆ID
}

// 扩展 MemoryFragment 类型
export interface MemoryFragment {
  // ... 原有字段
  methodType?: 'instruction' | 'code' | 'knowledge' | 'workflow' | string;  // 👈 添加 | string
  taskId?: string;              // 所属任务ID
  stepId?: string;              // 所属步骤ID
}