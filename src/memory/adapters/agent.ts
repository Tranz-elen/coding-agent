/**
 * Agent 适配器
 * 连接 Agent 核心与记忆系统
 */

import { cognitiveEvaluator } from '../core/cognitive.js';
import { layeredStorage } from '../core/storage.js';
import { reasoningEngine } from '../core/reasoning.js';
import { learningEngine } from '../core/learning.js';
import { feedbackProcessor } from '../core/feedback.js';
import { logger } from '../../utils/logger.js';
import {
  AgentInteraction,
  ToolExecutionResult,
  CompressedContext,
  Suggestion
} from '../interfaces/types.js';

export class AgentMemoryAdapter {
  private lastResponseId: string | null = null;
  private lastResponseContent: string | null = null;

  /**
   * 工具执行后调用
   */
  async onToolExecuted(result: ToolExecutionResult): Promise<void> {
    const significance = cognitiveEvaluator.evaluateToolResult(
      result.success,
      JSON.stringify(result.output).length
    );

    await layeredStorage.store({
      type: 'tool_execution',
      toolName: result.toolName,
      input: result.input,
      output: result.output,
      success: result.success,
      duration: result.duration,
      timestamp: result.timestamp
    }, significance);

    await reasoningEngine.recordActionResult(
      result.toolName,
      result.input,
      result.output,
      result.success
    );

    await learningEngine.receiveFeedback({
      outcome: result.success ? 'success' : 'failure',
      score: result.success ? 100 : 0,
      details: { toolName: result.toolName, duration: result.duration },
      timestamp: Date.now()
    });
  }

  /**
   * 用户输入后调用
   */
  async onUserInput(input: string, context?: any): Promise<void> {
    logger.memory('onUserInput 被调用:', input);

    const score = await cognitiveEvaluator.evaluate(input);
    logger.memory('认知评估得分:', score);

    const lastAgentResponse = this.getLastAgentResponse();
    
    const isCorrection = this.isCorrectionInput(input);

    if (isCorrection) {
      logger.correction('检测到更正信号，跳过情绪反馈');
    } else {
      const feedback = feedbackProcessor.analyzeFeedback(input);
      if (feedback) {
        await feedbackProcessor.linkToLastResponse(feedback, this.lastResponseId);
        if (feedback.type === 'positive') {
          await feedbackProcessor.handlePositive(feedback);
        } else if (feedback.type === 'negative') {
          await feedbackProcessor.handleNegative(feedback, input, lastAgentResponse);
        }
      }
    }

    logger.memory('准备调用 layeredStorage.store...');
    const result = await layeredStorage.store({
      type: 'user_input',
      content: input,
      context,
      timestamp: Date.now()
    }, score.final);

    logger.memory('layeredStorage.store 返回:', result);
    logger.memory('存储完成，得分:', score.final);
  }

  /**
   * Agent响应后调用
   */
  async onAgentResponse(response: string, context?: any): Promise<void> {
    const result = await layeredStorage.store({
      type: 'agent_response',
      content: response,
      context,
      timestamp: Date.now()
    }, 0.5);

    this.lastResponseId = result;
    this.lastResponseContent = response;
    logger.memory('Agent 回复已存储, ID:', result);
  }

  private getLastAgentResponse(): string | undefined {
    return this.lastResponseContent || undefined;
  }

  /**
   * 获取增强的上下文
   */
  async getEnhancedContext(currentContext: AgentInteraction[]): Promise<AgentInteraction[]> {
    const enhanced = [...currentContext];

    const lastInteraction = currentContext[currentContext.length - 1];
    if (lastInteraction) {
      const relevantMemories = await layeredStorage.retrieve({
        query: lastInteraction.content,
        limit: 3,
        minSignificance: 0.5
      });

      for (const memory of relevantMemories) {
        enhanced.unshift({
          role: 'system',
          content: `[记忆] ${JSON.stringify(memory.content)}`,
          timestamp: memory.timestamp
        });
      }
    }

    return enhanced;
  }

  /**
   * 获取压缩上下文
   */
  async getCompressedContext(maxTokens: number): Promise<CompressedContext> {
    const importantMemories = await layeredStorage.retrieve({
      query: {},
      limit: 10,
      minSignificance: 0.7
    });

    const summary = this.generateSummary(importantMemories);
    const keyPoints = this.extractKeyPoints(importantMemories);
    const tokenCount = Math.ceil(JSON.stringify(importantMemories).length / 2);

    return {
      summary,
      keyPoints,
      relevantMemories: importantMemories,
      tokenCount
    };
  }

  /**
   * 获取决策支持
   */
  async getDecisionSupport(state: any): Promise<Suggestion | null> {
    return reasoningEngine.suggest(state);
  }

  private generateSummary(memories: any[]): string {
    if (memories.length === 0) return '无重要记忆';

    const summary = memories.map(m => {
      if (m.content.type === 'tool_execution') {
        return `工具 ${m.content.toolName} 执行${m.content.success ? '成功' : '失败'}`;
      }
      if (m.content.type === 'user_input') {
        return `用户: ${m.content.content.substring(0, 50)}...`;
      }
      return JSON.stringify(m.content).substring(0, 100);
    }).join('\n');

    return `📋 重要记忆摘要:\n${summary}`;
  }

  private extractKeyPoints(memories: any[]): string[] {
    const points: string[] = [];

    for (const memory of memories) {
      if (memory.content.type === 'tool_execution' && memory.content.success) {
        points.push(`${memory.content.toolName} 可用`);
      }
      if (memory.content.type === 'user_input' && memory.significance > 0.8) {
        points.push(`用户关注: ${memory.content.content.substring(0, 30)}`);
      }
    }

    return points.slice(0, 5);
  }

  /**
   * 判断用户输入是否是更正信号
   */
  private isCorrectionInput(input: string): boolean {
    const patterns = [
      /更正一下/,
      /我更正/,
      /实际.*叫/,
      /应该是/,
      /不是.*而是/,
      /纠正/,
      /改一下/,
      /不对[，,]?\s*.*叫/,
      /错了[，,]?\s*.*叫/,
    ];
    
    return patterns.some(p => p.test(input));
  }
}

export const agentMemoryAdapter = new AgentMemoryAdapter();