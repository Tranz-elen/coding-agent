import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTool, ToolInput, ToolOutput } from './base.js';
import { loadConfig } from '../utils/config.js';
const CONFIG = loadConfig();  // 👈 在文件顶部加载一次

const execAsync = promisify(exec);

interface BashInput extends ToolInput {
  command: string;
  timeout?: number;
}

export class BashTool extends BaseTool<BashInput> {
  name = 'bash';
  
  description = `执行 shell 命令。返回命令的输出（stdout/stderr）。
  使用场景：
  - 运行测试、构建命令
  - git 操作
  - 安装依赖
  - 文件操作（ls, cp, mv）
  注意：避免长时间运行的命令，使用 timeout 参数限制执行时间。
  
  ⚠️ 重要：你在 Windows 系统上运行，优先使用 dir 而不是 ls。`;
  
  schema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: '要执行的 shell 命令（Windows 使用 dir, 不要用 ls）'
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒），默认 30000'
      }
    },
    required: ['command']
  };
  
  async execute(input: BashInput): Promise<ToolOutput> {
    const config = loadConfig();
    const MAX_OUTPUT_SIZE = config.maxOutputSize.bash;
      // 限制命令长度（最多 2000 字符）
    if (input.command.length > 2000) {
    return {
      success: false,
      message: `❌ 安全限制：命令过长 (${input.command.length} 字符)，最大允许 2000 字符`
      };
    } 

     // 👇 添加敏感命令检测
  const sensitiveCommands = [
    { cmd: /type\s+\.env/i, msg: '禁止读取 .env 文件' },
    { cmd: /cat\s+\.env/i, msg: '禁止读取 .env 文件' },
    { cmd: /type\s+\.git/i, msg: '禁止读取 .git 目录' },
    { cmd: /cat\s+\.git/i, msg: '禁止读取 .git 目录' },
    { cmd: /type\s+package-lock\.json/i, msg: '禁止读取 package-lock.json' },
    { cmd: /cat\s+package-lock\.json/i, msg: '禁止读取 package-lock.json' }
  ];

    for (const { cmd, msg } of sensitiveCommands) {
    if (cmd.test(input.command)) {
      return {
        success: false,
        message: `❌ 安全限制：${msg}`
      };
    }
  }
  
    const timeout = input.timeout || 30000;
    
    try {
      // 在 Windows 上，将 ls 转换为 dir（可选）
      let command = input.command;
      if (process.platform === 'win32' && command.trim() === 'ls') {
        command = 'dir';
      } else if (process.platform === 'win32' && command.trim() === 'ls -la') {
        command = 'dir';
      }
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout,
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
      });
      
      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += stderr;
      if (!output) output = '(无输出)';
      // 👇 新增：输出截断
      const MAX_OUTPUT_SIZE = 10000;
      let truncated = false;

      if (output.length > MAX_OUTPUT_SIZE) {
        output = output.substring(0, MAX_OUTPUT_SIZE) + 
                `\n\n... (输出过长，已截断，原长度 ${output.length} 字符)`;
        truncated = true;
      }

      return {
        success: true,
        message: output.trim() + (truncated ? '\n\n⚠️ 输出过长，已截断显示' : ''),
        data: { stdout, stderr }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `命令执行失败: ${error.message}`
      };
    }
  }
  
  isReadOnly(): boolean {
    return false;
  }
  
  isConcurrencySafe(): boolean {
    return false;
  }
}