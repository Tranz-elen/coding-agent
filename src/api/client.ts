import OpenAI from 'openai';
import 'dotenv/config';


export interface LLMConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  baseURL?: string;
  apiKey?: string;
}

export class LLMClient {
  private client: OpenAI;
  private config: LLMConfig;
  
  constructor(config?: Partial<LLMConfig>) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
    const baseURL = config?.baseURL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1';
    
    if (!apiKey) {
      throw new Error('请设置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY 环境变量');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });
    
    this.config = {
      model: config?.model || 'deepseek-chat',
      maxTokens: config?.maxTokens || 8192,
      temperature: config?.temperature || 0.7,
      baseURL: baseURL,
      apiKey: apiKey,
    };
  }
  
  async chat(
  messages: any[],
  tools?: any[],
  retries: number = 3  // 👈 添加重试次数参数
): Promise<{
  content: string;
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
  toolUses?: Array<{ id: string; name: string; input: any }>;
  usage: { inputTokens: number; outputTokens: number };
}> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const openAIMessages = this.convertToOpenAIFormat(messages);
      
      const requestParams: any = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: openAIMessages,
      };
      
      if (tools && tools.length > 0) {
        requestParams.tools = this.convertToOpenAITools(tools);
        requestParams.tool_choice = 'auto';
      }
      
      const response = await this.client.chat.completions.create(requestParams);
      
      // 解析响应（原有代码）
      const message = response.choices[0]?.message;
      const finishReason = response.choices[0]?.finish_reason;
      
      let content = message?.content || '';
      const toolUses: Array<{ id: string; name: string; input: any }> = [];
      
      if (message?.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const toolCallAny = toolCall as any;
          if (toolCallAny.function) {
          try {
            toolUses.push({
              id: toolCallAny.id,
              name: toolCallAny.function.name,
              input: JSON.parse(toolCallAny.function.arguments)
            });
          } catch (parseError) {
            console.error(`[WARN] 解析工具参数失败: ${toolCallAny.function.name}`);
            console.error(`[WARN] 原始参数: ${toolCallAny.function.arguments?.substring(0, 200)}`);
            // 跳过这个工具调用，继续处理
            continue;
          }
        }
        }
      }
      
      let stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
      if (finishReason === 'tool_calls') {
        stopReason = 'tool_use';
      } else if (finishReason === 'stop') {
        stopReason = 'end_turn';
      } else if (finishReason === 'length') {
        stopReason = 'max_tokens';
      } else {
        stopReason = 'end_turn';
      }
      
      return {
        content,
        stopReason,
        toolUses: toolUses.length > 0 ? toolUses : undefined,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0
        }
      };
    } catch (error: any) {
      lastError = error;
      
      // 判断是否值得重试
      const isRetryable = 
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ENOTFOUND') ||      // 👈 新增：DNS 解析失败
        error.message?.includes('getaddrinfo') ||    // 👈 新增：DNS 解析失败
        error.message?.includes('rate_limit') ||
        error.cause?.code === 'ENOTFOUND' ||           // 👈 新增：检查 cause 链
        error.cause?.code === 'ECONNRESET' ||          // 👈 新增
        error.cause?.code === 'ETIMEDOUT' ||           // 👈 新增
        error.status === 429 ||
        error.status === 500 ||
        error.status === 502 ||
        error.status === 503;
      
      if (!isRetryable || attempt === retries) {
        throw error;
      }
      
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`\n⚠️ API 调用失败 (${error.cause?.code || error.message})，${waitTime/1000} 秒后重试... (${attempt}/${retries})`);
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
  
  throw lastError;
}
  
  private convertToOpenAIFormat(messages: any[]): any[] {
  const result: any[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (msg.role === 'user') {
      result.push({
        role: 'user',
        content: msg.content
      });
    } 
    else if (msg.role === 'assistant') {
      if (Array.isArray(msg.content)) {
        const toolCalls = [];
        let textContent = '';
        
        for (const block of msg.content) {
          if (block.type === 'text') {
            textContent += block.text;
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input)
              }
            });
          }
        }
        
        // 只有当有 tool_calls 时才添加 tool_calls 字段
        const assistantMsg: any = {
          role: 'assistant',
          content: textContent || null
        };
        if (toolCalls.length > 0) {
          assistantMsg.tool_calls = toolCalls;
        }
        result.push(assistantMsg);
      } else {
        result.push({
          role: 'assistant',
          content: msg.content
        });
      }
    } 
    else if (msg.role === 'tool') {
      // 确保 tool 消息紧跟在 assistant 消息之后
      result.push({
        role: 'tool',
        tool_call_id: msg.content.tool_use_id,
        content: msg.content.content
      });
    }
  }
  
  // 调试：打印最后几条消息
  console.log('📨 消息数量:', result.length);
  console.log('📨 最后消息类型:', result.slice(-3).map(m => m.role));
  
  return result;
}
  
  private convertToOpenAITools(tools: any[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));
  }
}