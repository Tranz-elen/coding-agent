import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { BaseTool, ToolInput, ToolOutput } from './base.js';

interface GrepInput extends ToolInput {
  pattern: string;
  path?: string;
  type?: string;
  caseSensitive?: boolean;
}

export class GrepTool extends BaseTool<GrepInput> {
  name = 'grep';
  
  description = `在文件中搜索文本模式。支持正则表达式。`;
  
  schema = {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: '搜索模式（支持正则表达式）'
      },
      path: {
        type: 'string',
        description: '搜索路径（文件或目录，默认当前目录）'
      },
      type: {
        type: 'string',
        description: '文件类型过滤，如 "js", "ts", "txt"'
      },
      caseSensitive: {
        type: 'boolean',
        description: '是否区分大小写（默认 false）'
      }
    },
    required: ['pattern']
  };
  
  async execute(input: GrepInput): Promise<ToolOutput> {
    const searchPath = input.path || '.';
    const pattern = input.pattern;
    const caseSensitive = input.caseSensitive || false;
    
    try {
      // 构建正则表达式
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      } catch {
        // 如果不是有效正则，当作普通字符串
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
      }
      
      // 获取要搜索的文件列表
      let files: string[] = [];
      
      // 检查是否是单个文件
      try {
        const stat = await fs.stat(searchPath);
        if (stat.isFile()) {
          files = [searchPath];
        } else {
          // 是目录，使用 glob 查找文件
          const pattern = input.type ? `**/*.${input.type}` : '**/*';
          files = await glob(pattern, {
            cwd: searchPath,
            ignore: ['node_modules/**', '.git/**'],
            nodir: true
          });
          files = files.map(f => path.join(searchPath, f));
        }
      } catch {
        // 路径不存在或不是文件/目录，尝试作为 glob 模式
        files = await glob(searchPath, {
          ignore: ['node_modules/**', '.git/**'],
          nodir: true
        });
      }
      
      // 限制搜索文件数量
      const maxFiles = 100;
      if (files.length > maxFiles) {
        files = files.slice(0, maxFiles);
      }
      
      // 搜索每个文件
      const results: string[] = [];
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const fileName = path.basename(file);
              results.push(`${fileName}:${i + 1}: ${lines[i].trim()}`);
            }
          }
        } catch {
          // 跳过无法读取的文件
          continue;
        }
      }
      
      if (results.length === 0) {
        return {
          success: true,
          message: `没有找到匹配 "${pattern}" 的内容`
        };
      }
      
      // 限制结果数量
      const limitedResults = results.slice(0, 50);
      
      return {
        success: true,
        message: `找到 ${results.length} 处匹配:\n${limitedResults.join('\n')}${results.length > 50 ? '\n... (还有更多)' : ''}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `搜索失败: ${error.message}`
      };
    }
  }
  
  isReadOnly(): boolean {
    return true;
  }
}