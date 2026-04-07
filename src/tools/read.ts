import fs from 'fs/promises';
import path from 'path';
import { BaseTool, ToolInput, ToolOutput } from './base.js';

interface ReadInput extends ToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export class FileReadTool extends BaseTool<ReadInput> {
  name = 'read_file';
  
  description = `读取文件内容。支持文本文件、JSON、代码文件等。
  可以指定 offset 和 limit 来读取部分内容。
  返回文件内容。`;
  
  schema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: '文件路径（相对于当前工作目录）'
      },
      offset: {
        type: 'number',
        description: '起始行号（从 0 开始）'
      },
      limit: {
        type: 'number',
        description: '读取行数'
      }
    },
    required: ['file_path']
  };
  
  async execute(input: ReadInput): Promise<ToolOutput> {
    // 敏感文件黑名单
  const sensitivePatterns = [
    '.env', '.env.local', '.env.production',
    '.git/', 'node_modules/',
    'package-lock.json', 'yarn.lock',
    '~/.ssh', '~/.aws', '~/.config',
    '/etc/passwd', '/etc/shadow',
    'C:\\Windows\\System32\\', 'C:\\Windows\\System\\'
  ];
  
  for (const pattern of sensitivePatterns) {
    if (input.file_path.includes(pattern)) {
      return {
        success: false,
        message: `❌ 安全限制：禁止读取敏感文件/目录 (${pattern})`
      };
    }
  }
    try {
      const fullPath = path.resolve(process.cwd(), input.file_path);
      
      if (!fullPath.startsWith(process.cwd())) {
        return {
          success: false,
          message: `安全错误：不能读取项目目录外的文件: ${input.file_path}`
        };
      }
      
      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          message: `文件不存在: ${input.file_path}`
        };
      }
      
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      let result = content;
      if (input.offset !== undefined || input.limit !== undefined) {
        const start = input.offset || 0;
        const end = input.limit ? start + input.limit : lines.length;
        result = lines.slice(start, end).join('\n');
        
        result = result.split('\n')
          .map((line, i) => `${start + i + 1}: ${line}`)
          .join('\n');
      }
      
      return {
        success: true,
        message: result || '(空文件)'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `读取失败: ${error.message}`
      };
    }
  }
  
  isReadOnly(): boolean {
    return true;
  }
}