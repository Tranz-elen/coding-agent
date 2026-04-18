import { AgentInteraction, ToolExecutionResult, CompressedContext } from './types.js';

/**
 * Agent 适配器接口 - 连接记忆系统与现有 Agent
 */
export interface IAgentMemoryAdapter {
  /** 在工具执行后调用 */
  onToolExecuted(result: ToolExecutionResult): Promise<void>;
  
  /** 在用户输入后调用 */
  onUserInput(input: string, context: any): Promise<void>;
  
  /** 在 Agent 响应后调用 */
  onAgentResponse(response: string, context: any): Promise<void>;
  
  /** 获取增强的上下文 */
  getEnhancedContext(currentContext: AgentInteraction[]): Promise<AgentInteraction[]>;
}

/**
 * 会话适配器接口 - 替代现有 session.ts
 */
export interface ISessionMemoryAdapter {
  /** 保存会话（增强版） */
  saveSession(sessionId: string, interactions: AgentInteraction[]): Promise<void>;
  
  /** 加载会话 */
  loadSession(sessionId: string): Promise<AgentInteraction[]>;
  
  /** 获取会话摘要（增强版） */
  getSessionSummary(sessionId: string): Promise<string>;
  
  /** 跨会话关联 */
  linkSessions(sessionId1: string, sessionId2: string, reason: string): Promise<void>;
}

/**
 * 工具适配器接口 - 替代现有缓存
 */
export interface IToolMemoryAdapter {
  /** 缓存工具执行（增强版） */
  cacheToolResult(toolName: string, input: any, output: any): Promise<void>;
  
  /** 获取相似工具执行 */
  getSimilarToolExecutions(toolName: string, currentInput: any, limit?: number): Promise<ToolExecutionResult[]>;
  
  /** 提取可复用模式 */
  extractPatterns(toolName: string): Promise<any[]>;
}