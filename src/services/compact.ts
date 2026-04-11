import { LLMClient } from '../api/client.js';
import { Message } from '../agent/types.js';
import { loadConfig } from '../utils/config.js';
import { sessionSummary } from './sessionSummary.js';

const CONFIG = loadConfig();

export interface CompactResult {
  summary: string;
  keyInfo: {
    completedWork: string[];
    currentStatus: string[];
    pendingTasks: string[];
    modifiedFiles: string[];
    errors: string[];
    decisions: string[];
  };
  compressedMessages: Message[];
}

export class ContextCompressor {
  private llm: LLMClient;
  private MAX_TOKENS: number;
  private KEEP_RECENT: number;

  constructor() {
    this.llm = new LLMClient();
    // 从配置文件读取
    this.MAX_TOKENS = CONFIG.compress.maxTokens;
    this.KEEP_RECENT = CONFIG.compress.keepRecent;
  }

  // 估算 token 数（中英文混合约 2 字符/token）
  private estimateTokenCount(messages: Message[]): number {
    const json = JSON.stringify(messages);
    return Math.ceil(json.length / 2);
  }
  
  // 检查是否需要压缩
  needsCompression(messages: Message[]): boolean {
    const tokenCount = this.estimateTokenCount(messages);
    const shouldCompress = tokenCount > this.MAX_TOKENS;
    
    if (shouldCompress) {
      console.log(`📊 当前 token: ${tokenCount}，超过阈值 ${this.MAX_TOKENS}，触发压缩`);
    }
    
    return shouldCompress;
  }
  
  // 执行压缩
  async compress(messages: Message[], sessionId?: string): Promise<Message[]> {
  const beforeSize = JSON.stringify(messages).length;
  console.log(`[DEBUG] 压缩前大小: ${beforeSize} 字符`);
  
  const toCompress = messages.slice(0, -this.KEEP_RECENT);
  let recent = messages.slice(-this.KEEP_RECENT);
  
  console.log(`📦 开始压缩上下文: ${toCompress.length} 条消息 → 摘要`);
  
  // 如果最近消息以 tool 开头，需要保留对应的 assistant 消息
  if (recent.length > 0 && recent[0].role === 'tool') {
    for (let i = messages.length - this.KEEP_RECENT - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        recent = [messages[i], ...recent];
        break;
      }
    }
  }
  
  // 生成结构化摘要
  const summaryResult = await this.generateStructuredSummary(toCompress);
  
  // 👇 保存摘要到磁盘（需要 sessionId）
  if (sessionId) {
    const summaryData = {
      sessionId: sessionId,
      summary: this.formatSummary(summaryResult),
      keyInfo: summaryResult.keyInfo,
      timestamp: Date.now(),
      messageCount: messages.length
    };
    await sessionSummary.saveSummary(sessionId, summaryData);
    console.log(`📝 保存会话摘要: ${sessionId.slice(-8)}`);
  }
  
  const result: Message[] = [
    {
      role: 'system' as const,
      content: this.formatSummary(summaryResult)
    } as Message,
    ...recent
  ];
  
  const afterSize = JSON.stringify(result).length;
  const reduction = beforeSize - afterSize;
  const percent = ((reduction / beforeSize) * 100).toFixed(1);
  console.log(`[DEBUG] 压缩后大小: ${afterSize} 字符，减少: ${reduction} 字符 (${percent}%)`);
  console.log(`✅ 压缩完成: 保留关键信息 (文件内容已缓存，需要时可重新读取)`);
  
  return result;
}
  
  // 生成结构化摘要
  private async generateStructuredSummary(messages: Message[]): Promise<CompactResult> {
    const prompt = `请分析以下对话历史，按类别提取关键信息：

## 对话历史
${JSON.stringify(messages, null, 2)}

## 请按以下格式输出：

### 已完成工作
- [列出已经完成的任务]

### 当前状态
- [描述当前项目状态]

### 待办任务
- [列出尚未完成的任务]

### 修改的文件
- [列出所有被创建/编辑/删除的文件]

### 遇到的错误
- [列出所有错误信息]

### 用户决策
- [列出用户的重要决定]

请只输出上述格式，不要添加额外内容。`;

    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ], []);
    
    return this.parseSummary(response.content);
  }
  
  // 解析 LLM 返回的摘要
  private parseSummary(content: string): CompactResult {
    const keyInfo = {
      completedWork: [] as string[],
      currentStatus: [] as string[],
      pendingTasks: [] as string[],
      modifiedFiles: [] as string[],
      errors: [] as string[],
      decisions: [] as string[]
    };
    
    const sections = [
      { name: '已完成工作', target: 'completedWork' },
      { name: '当前状态', target: 'currentStatus' },
      { name: '待办任务', target: 'pendingTasks' },
      { name: '修改的文件', target: 'modifiedFiles' },
      { name: '遇到的错误', target: 'errors' },
      { name: '用户决策', target: 'decisions' }
    ];
    
    for (const section of sections) {
      const regex = new RegExp(`### ${section.name}[\\s\\S]*?(?=###|$)`, 'i');
      const match = content.match(regex);
      if (match) {
        const lines = match[0].split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().replace(/^-\s*/, ''));
        keyInfo[section.target as keyof typeof keyInfo] = lines;
      }
    }
    
    return {
      summary: content,
      keyInfo,
      compressedMessages: []
    };
  }
  
  // 格式化摘要为系统消息
  private formatSummary(result: CompactResult): string {
    const lines = [
      '📋 **对话摘要（已压缩）**\n',
      '### 已完成工作'
    ];
    
    for (const item of result.keyInfo.completedWork) {
      lines.push(`- ${item}`);
    }
    
    lines.push('\n### 当前状态');
    for (const item of result.keyInfo.currentStatus) {
      lines.push(`- ${item}`);
    }
    
    lines.push('\n### 待办任务');
    for (const item of result.keyInfo.pendingTasks) {
      lines.push(`- ${item}`);
    }
    
    if (result.keyInfo.modifiedFiles.length > 0) {
      lines.push('\n### 修改的文件');
      for (const item of result.keyInfo.modifiedFiles) {
        lines.push(`- ${item}`);
      }
    }
    
    if (result.keyInfo.errors.length > 0) {
      lines.push('\n### 遇到的错误');
      for (const item of result.keyInfo.errors) {
        lines.push(`- ${item}`);
      }
    }
    
    if (result.keyInfo.decisions.length > 0) {
      lines.push('\n### 用户决策');
      for (const item of result.keyInfo.decisions) {
        lines.push(`- ${item}`);
      }
    }
    
    return lines.join('\n');
  }
}

export const contextCompressor = new ContextCompressor();