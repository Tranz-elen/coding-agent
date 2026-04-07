import { BaseTool, ToolInput, ToolOutput } from './base.js';

interface WebFetchInput extends ToolInput {
  url: string;
  max_length?: number;
}

export class WebFetchTool extends BaseTool<WebFetchInput> {
  name = 'web_fetch';
  
  description = `获取网页内容。可以获取指定 URL 的文本内容。

使用场景：
- 获取 API 文档
- 读取网页内容
- 抓取信息

注意：返回的内容会被截断到指定长度（默认 5000 字符）`;
  
  schema = {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: '要获取的网页 URL'
      },
      max_length: {
        type: 'number',
        description: '返回内容的最大长度（字符数），默认 5000'
      }
    },
    required: ['url']
  };
  
  async execute(input: WebFetchInput): Promise<ToolOutput> {
    const { url, max_length = 5000 } = input;
    
    try {
      // 验证 URL
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('http')) {
        return {
          success: false,
          message: `❌ 不支持的协议: ${urlObj.protocol}，只支持 HTTP/HTTPS`
        };
      }
      
      // 发送请求
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CodingAgent/1.0)'
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          message: `❌ HTTP 错误: ${response.status} ${response.statusText}`
        };
      }
      
      // 获取内容
      const contentType = response.headers.get('content-type') || '';
      let content: string;
      
      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
      }
      
      // 截断内容
      let result = content;
      let truncated = false;
      if (content.length > max_length) {
        result = content.substring(0, max_length);
        truncated = true;
      }
      
      const message = `✅ 成功获取 ${url}\n📊 内容长度: ${content.length} 字符\n${truncated ? `⚠️ 已截断至 ${max_length} 字符\n\n` : '\n\n'}${result}`;
      
      return {
        success: true,
        message,
        data: { url, content: result, fullLength: content.length, truncated }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ 获取失败: ${error.message}`
      };
    }
  }
  
  isReadOnly(): boolean {
    return true;
  }
}