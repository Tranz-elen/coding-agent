import { BaseTool, ToolInput, ToolOutput } from './base.js';

// Gemini API 响应类型
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

// Tavily 响应类型
interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
  query: string;
}

interface WebSearchInput extends ToolInput {
  query: string;
  max_results?: number;
}

export class WebSearchTool extends BaseTool<WebSearchInput> {
  name = 'web_search';
  
  description = `搜索网络信息。优先使用 Gemini API，失败时自动降级到 Tavily。

使用场景：
- 查找最新文档
- 搜索技术问题
- 获取实时信息

注意：可配置 GEMINI_API_KEY 和 TAVILY_API_KEY。`;
  
  schema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词'
      },
      max_results: {
        type: 'number',
        description: '返回结果数量，默认 5，最多 10'
      }
    },
    required: ['query']
  };
  
  async execute(input: WebSearchInput): Promise<ToolOutput> {
    const { query, max_results = 5 } = input;
    const limit = Math.min(max_results, 10);
    
    // 1. 优先尝试 Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const geminiResult = await this.searchWithGemini(query, geminiApiKey);
      if (geminiResult.success) {
        return geminiResult;
      }
      console.log(`⚠️ Gemini 搜索失败: ${geminiResult.message}，降级到 Tavily`);
    }
    
    // 2. 降级到 Tavily
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (tavilyApiKey) {
      const tavilyResult = await this.searchWithTavily(query, limit, tavilyApiKey);
      if (tavilyResult.success) {
        return tavilyResult;
      }
      console.log(`⚠️ Tavily 搜索失败: ${tavilyResult.message}`);
    }
    
    return {
      success: false,
      message: `❌ 所有搜索源均失败。请检查 API Key 配置。\n\nGemini API Key: ${geminiApiKey ? '已配置' : '未配置'}\nTavily API Key: ${tavilyApiKey ? '已配置' : '未配置'}`
    };
  }
  
  private async searchWithGemini(query: string, apiKey: string): Promise<ToolOutput> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `请搜索以下问题并返回相关结果，包含标题、链接和简短摘要：${query}。请用中文回答，格式清晰。`
            }]
          }]
        })
      });
      
      if (!response.ok) {
        return { success: false, message: `Gemini API 错误: ${response.status}` };
      }
      
      const data = await response.json() as GeminiResponse;
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '未找到结果';
      
      return {
        success: true,
        message: `🔍 搜索 "${query}" 的结果（来源：Gemini）：\n\n${resultText}`,
        data: { query, source: 'gemini', result: resultText }
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
  
  private async searchWithTavily(query: string, limit: number, apiKey: string): Promise<ToolOutput> {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          max_results: limit,
          include_answer: true,
          include_raw_content: false
        })
      });
      
      if (!response.ok) {
        return { success: false, message: `Tavily API 错误: ${response.status}` };
      }
      
      const data = await response.json() as TavilyResponse;
      
      if (!data.results || data.results.length === 0) {
        return {
          success: true,
          message: `🔍 搜索 "${query}" 未找到相关结果。`,
          data: { query, source: 'tavily', results: [] }
        };
      }
      
      const resultText = this.formatTavilyResults(data, query);
      
      return {
        success: true,
        message: resultText,
        data: { query, source: 'tavily', results: data.results }
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
  
  private formatTavilyResults(data: TavilyResponse, query: string): string {
    const lines = [`🔍 搜索 "${query}" 的结果（来源：Tavily）：\n`];
    
    if (data.answer) {
      lines.push(`📌 **AI 摘要**：${data.answer}\n`);
    }
    
    for (let i = 0; i < data.results.length; i++) {
      const r = data.results[i];
      lines.push(`${i + 1}. **${r.title}**`);
      if (r.url) lines.push(`   🔗 ${r.url}`);
      if (r.content) lines.push(`   📝 ${r.content.substring(0, 300)}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  isReadOnly(): boolean {
    return true;
  }
}