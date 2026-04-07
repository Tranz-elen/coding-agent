// 正确的导入方式
import { glob } from 'glob';
import { BaseTool } from './base.js';

interface GlobInput {
  pattern: string;
  directory?: string;
}

export class GlobTool extends BaseTool<GlobInput> {
  name = 'glob';
  
  description = `使用 glob 模式查找文件。
  支持通配符：* 匹配任意字符，** 匹配任意层级目录。
  示例：
  - "**/*.ts" 查找所有 TypeScript 文件
  - "src/**/test/**" 查找 src 下所有 test 目录中的文件`;
  
  schema = {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'glob 匹配模式'
      },
      directory: {
        type: 'string',
        description: '搜索目录（默认当前目录）'
      }
    },
    required: ['pattern']
  };
  
  async execute(input: GlobInput): Promise<{ success: boolean; message: string }> {
    try {
      const cwd = input.directory || process.cwd();
      
      // 使用 glob 函数，支持异步
      const files = await glob(input.pattern, {
        cwd,
        ignore: ['node_modules/**', '.git/**'],
        nodir: true  // 只返回文件，不返回目录
      });
      
      if (files.length === 0) {
        return {
          success: true,
          message: `没有找到匹配 "${input.pattern}" 的文件`
        };
      }
      
      // 格式化输出，每行一个文件
      const fileList = files.slice(0, 100).join('\n');
      
      return {
        success: true,
        message: `找到 ${files.length} 个文件:\n${fileList}${files.length > 100 ? '\n... (还有更多)' : ''}`
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