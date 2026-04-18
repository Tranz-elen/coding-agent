/**
 * 工具适配器
 * 增强工具缓存，集成记忆系统
 */

import { ToolExecutionResult } from '../interfaces/types.js';
import { cognitiveEvaluator } from '../core/cognitive.js';
import { layeredStorage } from '../core/storage.js';
import { reasoningEngine } from '../core/reasoning.js';
import fs from 'fs/promises';
import path from 'path';

export interface ToolMemory {
  toolName: string;
  input: any;
  output: any;
  success: boolean;
  timestamp: number;
  significance: number;
}

export class ToolMemoryAdapter {
  private cacheDir: string;
  
  constructor() {
    this.cacheDir = path.join(process.cwd(), '.toolcache');
  }
  
  /**
   * 缓存工具执行结果（增强版）
   */
  async cacheToolResult(toolName: string, input: any, output: any, success: boolean): Promise<void> {
    // 1. 评估重要性
    const significance = cognitiveEvaluator.evaluateToolResult(success, JSON.stringify(output).length);
    
    // 2. 存储到分层存储
    await layeredStorage.store({
      type: 'tool_cache',
      toolName,
      input,
      output,
      success,
      timestamp: Date.now()
    }, significance);
    
    // 3. 存储到磁盘缓存
    await fs.mkdir(this.cacheDir, { recursive: true });
    const cacheFile = path.join(this.cacheDir, `${toolName}_${Date.now()}.json`);
    await fs.writeFile(cacheFile, JSON.stringify({
      toolName,
      input,
      output,
      success,
      timestamp: Date.now(),
      significance
    }, null, 2));
    
    // 4. 记录用于推理
    await reasoningEngine.recordActionResult(toolName, input, output, success);
  }
  
  /**
   * 获取相似工具执行记录
   */
  async getSimilarToolExecutions(toolName: string, currentInput: any, limit: number = 5): Promise<ToolMemory[]> {
    // 从记忆系统检索相似记录
    const memories = await layeredStorage.retrieve({
      query: { toolName, input: currentInput },
      type: 'instance',
      limit,
      minSignificance: 0.3
    });
    
    const results: ToolMemory[] = [];
    for (const memory of memories) {
      if (memory.content.type === 'tool_cache' && memory.content.toolName === toolName) {
        results.push({
          toolName: memory.content.toolName,
          input: memory.content.input,
          output: memory.content.output,
          success: memory.content.success,
          timestamp: memory.content.timestamp,
          significance: memory.significance
        });
      }
    }
    
    return results;
  }
  
  /**
   * 提取可复用模式
   */
  async extractPatterns(toolName: string): Promise<any[]> {
    const patterns: any[] = [];
    
    // 获取该工具的所有执行记录
    const memories = await layeredStorage.retrieve({
      query: { toolName },
      type: 'instance',
      limit: 50
    });
    
    // 分析成功模式
    const successExecutions = memories.filter(m => 
      m.content.type === 'tool_cache' && 
      m.content.toolName === toolName && 
      m.content.success
    );
    
    if (successExecutions.length >= 3) {
      // 提取共同特征
      const commonInputs: any = {};
      for (const exec of successExecutions) {
        const input = exec.content.input;
        for (const key in input) {
          if (commonInputs[key] === undefined) {
            commonInputs[key] = input[key];
          } else if (commonInputs[key] !== input[key]) {
            commonInputs[key] = '[可变]';
          }
        }
      }
      
      patterns.push({
        type: 'success_pattern',
        toolName,
        commonInputs,
        confidence: successExecutions.length / memories.length,
        exampleCount: successExecutions.length
      });
    }
    
    return patterns;
  }
  
  /**
   * 获取工具使用建议
   */
  async getToolSuggestion(toolName: string, currentInput: any): Promise<any | null> {
    const similar = await this.getSimilarToolExecutions(toolName, currentInput, 3);
    
    if (similar.length === 0) {
      return null;
    }
    
    // 取最相似的成功执行
    const bestMatch = similar.find(s => s.success);
    if (bestMatch) {
      return {
        suggestedInput: bestMatch.input,
        expectedOutput: bestMatch.output,
        confidence: bestMatch.significance,
        basedOn: `基于 ${similar.length} 次历史执行`
      };
    }
    
    return null;
  }
  
  /**
   * 清理过期缓存
   */
  async cleanExpired(maxAgeDays: number = 7): Promise<number> {
    let cleaned = 0;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
    } catch {
      // 目录不存在
    }
    
    return cleaned;
  }
  
  /**
   * 获取缓存统计
   */
  async getStats(): Promise<{ total: number; byTool: Record<string, number> }> {
    const byTool: Record<string, number> = {};
    let total = 0;
    
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          total++;
          const toolName = file.split('_')[0];
          byTool[toolName] = (byTool[toolName] || 0) + 1;
        }
      }
    } catch {
      // 目录不存在
    }
    
    return { total, byTool };
  }
}

export const toolMemoryAdapter = new ToolMemoryAdapter();