import fs from 'fs/promises';
import path from 'path';
import { BaseTool } from './base.js';

interface WriteInput {
  file_path: string;
  content: string;
}

export class FileWriteTool extends BaseTool<WriteInput> {
  name = 'write_file';
  
  description = `写入文件。如果文件不存在则创建，如果存在则覆盖。
  用于创建新文件或完全替换文件内容。
  注意：这会覆盖现有内容，谨慎使用！`;
  
  schema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: '文件路径（相对于当前工作目录）'
      },
      content: {
        type: 'string',
        description: '要写入的内容'
      }
    },
    required: ['file_path', 'content']
  };
  
  async execute(input: WriteInput): Promise<{ success: boolean; message: string }> {
    try {
      const fullPath = path.resolve(process.cwd(), input.file_path);
      
      // 安全检查
      if (!fullPath.startsWith(process.cwd())) {
        return {
          success: false,
          message: `安全错误：不能写入项目目录外的文件: ${input.file_path}`
        };
      }
      
      // 确保目录存在
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      
      // 写入文件
      await fs.writeFile(fullPath, input.content, 'utf-8');
      
      // 统计写入的信息
      const lines = input.content.split('\n').length;
      const bytes = Buffer.byteLength(input.content, 'utf-8');
      
      return {
        success: true,
        message: `成功写入 ${input.file_path}\n行数: ${lines}, 大小: ${bytes} 字节`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `写入失败: ${error.message}`
      };
    }
  }
  
  isReadOnly(): boolean {
    return false;
  }
}