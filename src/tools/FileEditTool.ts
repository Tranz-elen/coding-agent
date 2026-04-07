import fs from 'fs/promises';
import path from 'path';
import { BaseTool, ToolInput, ToolOutput } from './base.js';

interface FileEditInput extends ToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export class FileEditTool extends BaseTool<FileEditInput> {
  name = 'file_edit';
  
  description = `编辑文件内容，替换指定的字符串。

使用场景：
- 修改文件中的特定代码
- 更新配置值
- 修复 bug

注意：
- 会保留文件的其余部分不变
- replace_all: true 替换所有匹配项，默认只替换第一个`;
  
  schema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: '文件路径'
      },
      old_string: {
        type: 'string',
        description: '要替换的原始字符串'
      },
      new_string: {
        type: 'string',
        description: '替换后的新字符串'
      },
      replace_all: {
        type: 'boolean',
        description: '是否替换所有匹配项（默认 false）'
      }
    },
    required: ['file_path', 'old_string', 'new_string']
  };
  
  async execute(input: FileEditInput): Promise<ToolOutput> {
    const { file_path, old_string, new_string, replace_all = false } = input;
    
    try {
      const fullPath = path.resolve(process.cwd(), file_path);
      
      // 安全检查
      if (!fullPath.startsWith(process.cwd())) {
        return {
          success: false,
          message: `❌ 不能编辑项目目录外的文件: ${file_path}`
        };
      }
      
      // 检查文件是否存在
      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          message: `❌ 文件不存在: ${file_path}`
        };
      }
      
      // 读取文件
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // 检查是否包含要替换的字符串
      if (!content.includes(old_string)) {
        return {
          success: false,
          message: `❌ 找不到要替换的字符串:\n"${old_string}"`
        };
      }
      
      // 执行替换
      let newContent: string;
      let replaceCount: number;
      
      if (replace_all) {
        const regex = new RegExp(escapeRegex(old_string), 'g');
        const matches = content.match(regex);
        replaceCount = matches ? matches.length : 0;
        newContent = content.replace(regex, new_string);
      } else {
        newContent = content.replace(old_string, new_string);
        replaceCount = content !== newContent ? 1 : 0;
      }
      
      // 写入文件
      await fs.writeFile(fullPath, newContent, 'utf-8');
      
      return {
        success: true,
        message: `✅ 成功编辑 ${file_path}\n   替换了 ${replaceCount} 处\n   "${old_string}" → "${new_string}"`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ 编辑失败: ${error.message}`
      };
    }
  }
  
  isReadOnly(): boolean {
    return false;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}