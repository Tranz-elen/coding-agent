import { LLMClient } from '../api/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { sessionManager, type Session } from '../state/session.js'; 
import { permissionChecker } from '../permissions/checker.js';
import { PermissionMode } from '../permissions/types.js';
import readline from 'readline';
import { contextCompressor } from '../services/compact.js';
import { loadConfig } from '../utils/config.js'
import { fileCache } from '../services/fileCache.js';


export interface AgentConfig {
  maxIterations?: number;
  verbose?: boolean;
}

export class AgentLoop {
  private llm: LLMClient;
  private toolRegistry: ToolRegistry;
  private messages: any[] = [];
  private config: AgentConfig;
  private session: Session | null = null;      // 👈 新增
  private sessionId: string | null = null;     // 👈 新增
  private rl: readline.Interface | null = null; 

  private lastToolCallKey: string = '';        // 👈 新增
  private sameToolCallCount: number = 0;       // 👈 新增
  private readonly MAX_SAME_CALL = 3;          // 👈 新增

  private lastMessageCount: number = 0;
  private noProgressCount: number = 0;
  private readonly MAX_NO_PROGRESS = 5;
  
  constructor(config?: AgentConfig & { sessionId?: string }) {
    this.llm = new LLMClient();
    this.toolRegistry = ToolRegistry.getInstance();
    const fileConfig = loadConfig();
    
    this.config = {
      maxIterations: config?.maxIterations ?? fileConfig.maxIterations,
      verbose: config?.verbose ?? fileConfig.verbose
    };
    
    this.sessionId = config?.sessionId || null;
    this.initSession(this.sessionId);
    // 👇 添加：清理过期缓存
    fileCache.cleanExpired();
  }
  setReadline(rlInstance: readline.Interface): void {
  this.rl = rlInstance;
  const askTool = this.toolRegistry.get('ask_user_question') as any;
  if (askTool && askTool.setReadline) {
    askTool.setReadline(rlInstance);
  }
  fileCache.cleanExpiredCache(7).catch(console.error);
  fileCache.limitCacheSize(100).catch(console.error);
}
  private async addSystemMessage() {
  const systemPrompt = `你是一个专业的编程助手。

## 可用工具
${this.toolRegistry.getAll().map(tool => 
  `- ${tool.name}: ${tool.description}`
).join('\n')}

## 重要规则
1.**问题诊断与修复（强制规则）**：当用户报告程序出问题（如"不工作了"、"有bug"、"不见了"、"出问题了"）时，你必须按以下步骤执行：

   步骤1：用 read_file 完整读取相关文件（不加 offset/limit）
   步骤2：分析问题原因
   步骤3：**必须立即用 file_edit 修复**，不要只给建议
   步骤4：修复完成后回复："已修复：具体改了xxx"
   
   **禁止行为**：
   - 禁止只分析问题不给修复
   - 禁止执行 grep 探索性命令
   - 禁止分块读取文件（offset/limit）
   - 禁止执行 dir/ls 查看目录
   
   **示例**：
   用户："贪吃蛇不见了"
   正确做法：read_file → 发现问题 → file_edit 修复 → 回复"已修复"
   错误做法：grep → read_file 分块 → 分析 → 只给建议
2. **直接响应**：用户说"执行 X"时，直接调用 bash 执行，不要先探索
3. **Todo 列表**：当任务需要 3 个以上步骤时，先用 todo_write 创建任务列表
4. **Windows 环境**：使用 dir 而不是 ls
5. 当用户取消某个操作时，继续处理其他任务
6. 不要因为一个操作被取消而完全停止
7. 直接回复用户操作结果

## Todo 使用示例

用户: "帮我创建一个 React 组件"
你: 
1. todo_write action="add" todos=[{content:"创建组件文件"},{content:"创建样式文件"}]
2. 然后开始工作...

现在，请开始工作。`;

  this.messages.push({
    role: 'assistant',
    content: systemPrompt
  });
  await this.saveCurrentSession();  // 保存当前会话
}

private async initSession(sessionId?: string): Promise<void> {
  console.log(`🔍 尝试恢复会话: ${sessionId}`);  // 添加调试
  if (sessionId) {
    // 恢复已有会话
    const session = await sessionManager.loadSession(sessionId);
    if (session) {
      this.session = session;
      this.sessionId = session.id;
      this.messages = session.messages;
      console.log(`📂 恢复会话: ${session.name} (${this.sessionId})`);
      return;
    }
  }
  // 只有没有 sessionId 或 session 不存在时才创建新会话
  // 创建新会话
  this.session = await sessionManager.createSession('新会话', []);
  this.sessionId = this.session.id;
  await this.addSystemMessage();
  console.log(`📝 新会话: ${this.sessionId}`);
}

// 保存当前会话
private async saveCurrentSession(): Promise<void> {
  if (this.session) {
    await sessionManager.updateSession(this.session.id, this.messages);
  }
}
  
  async processUserInput(userInput: string): Promise<string> {
  // 👇 临时禁用压缩
  //if (contextCompressor.needsCompression(this.messages)) {
  //  console.log('\n📦 上下文过长，正在压缩...');
  //  this.messages = await contextCompressor.compress(this.messages);
  //  await this.saveCurrentSession();
  //  console.log('✅ 压缩完成，继续处理...\n');
 // }
  
  this.messages.push({
    role: 'user',
    content: userInput
  });
  
  let iteration = 0;
  let finalAnswer = '';
  
  while (true) {
     // 👇 临时禁用压缩
    //if (contextCompressor.needsCompression(this.messages)) {
    //  console.log('\n📦 上下文过长（循环中检测到），正在压缩...');
    //  this.messages = await contextCompressor.compress(this.messages);
    //  await this.saveCurrentSession();
    //  console.log('✅ 压缩完成，继续处理...\n');
    //}
    if (contextCompressor.needsCompression(this.messages)) {
    console.log('\n📦 上下文过长，正在压缩...');
    this.messages = await contextCompressor.compress(this.messages);
    await this.saveCurrentSession();
    console.log('✅ 压缩完成，继续处理...\n');
  }
    
    if (this.config.verbose) {
      console.log(`\n🔄 继续处理...`);
    }
    
    const tools = this.toolRegistry.getLLMToolDefinitions();
    
    if (this.config.verbose) {
      console.log('📡 调用 LLM...');
    }
    
    const response = await this.llm.chat(this.messages, tools);
    
    if (this.config.verbose) {
      console.log(`📥 响应类型: ${response.stopReason}`);
      console.log(`📊 Token 使用: 输入=${response.usage.inputTokens}, 输出=${response.usage.outputTokens}`);
    }
    
    // 没有工具调用，结束
    if (response.stopReason === 'end_turn') {
      finalAnswer = response.content;
      this.messages.push({
        role: 'assistant',
        content: response.content
      });
      await this.saveCurrentSession();
      break;
    } 
    // 有工具调用
    else if (response.stopReason === 'tool_use' && response.toolUses) {
      if (this.config.verbose) {
        console.log(`🔧 执行 ${response.toolUses.length} 个工具:`);
        response.toolUses.forEach(tool => {
          console.log(`   - ${tool.name}:`, JSON.stringify(tool.input).slice(0, 100));
        });
      }
      
      this.messages.push({
        role: 'assistant',
        content: response.toolUses.map(tool => ({
          type: 'tool_use',
          id: tool.id,
          name: tool.name,
          input: tool.input
        }))
      });
      
      // 执行每个工具
      for (const toolUse of response.toolUses!) {
        // 循环检测
        const toolCallKey = `${toolUse.name}_${JSON.stringify(toolUse.input)}`;
        if (toolCallKey === this.lastToolCallKey) {
          this.sameToolCallCount++;
          if (this.sameToolCallCount >= this.MAX_SAME_CALL) {
            const errorMsg = `⚠️ 检测到循环调用：工具 "${toolUse.name}" 连续 ${this.MAX_SAME_CALL} 次使用相同参数。请检查任务规划。`;
            this.messages.push({
              role: 'tool',
              content: {
                tool_use_id: toolUse.id,
                content: errorMsg,
                is_error: true
              }
            });
            return errorMsg;
          }
        } else {
          this.lastToolCallKey = toolCallKey;
          this.sameToolCallCount = 0;
        }
        
        const tool = this.toolRegistry.get(toolUse.name);
        
        if (!tool) {
          this.messages.push({
            role: 'tool',
            content: {
              tool_use_id: toolUse.id,
              content: `错误: 工具 "${toolUse.name}" 不存在`,
              is_error: true
            }
          });
          await this.saveCurrentSession();  
          continue;
        }
        
        // 权限检查
        const permission = await permissionChecker.checkPermission(
          {
            toolName: toolUse.name,
            input: toolUse.input
          },
          this.sessionId || undefined
        );
        
        if (!permission.allowed) {
          this.messages.push({
            role: 'tool',
            content: {
              tool_use_id: toolUse.id,
              content: `⛔ 权限拒绝: ${permission.reason || '操作不被允许'}`,
              is_error: true
            }
          });
          continue;
        }
        
        if (permission.needConfirm && permission.mode === PermissionMode.ASK) {
          console.log(`\n⚠️ 需要确认: ${permission.reason || '请确认此操作'}`);
          console.log(`   工具: ${toolUse.name}`);
          console.log(`   参数: ${JSON.stringify(toolUse.input, null, 2)}`);
          console.log(`   选项: y(是) / n(否) / 记住(记住选择)`);
          
          const answer = await this.askConfirmation();
          
          if (answer === '记住' || answer === 'remember') {
            await permissionChecker.addPersistedRule(
              this.sessionId || 'default',
              toolUse.name,
              PermissionMode.ALLOW,
              `用户已记住: ${toolUse.name}`,
              7 * 24 * 60 * 60 * 1000
            );
            console.log(`✅ 已记住 ${toolUse.name}，后续不再询问`);
            
            try {
              const result = await tool.execute(toolUse.input);
              this.messages.push({
                role: 'tool',
                content: {
                  tool_use_id: toolUse.id,
                  content: result.message,
                  is_error: !result.success
                }
              });
              if (this.config.verbose) {
                console.log(`   ✅ ${toolUse.name}: ${result.message.slice(0, 100)}`);
              }
            } catch (error: any) {
              this.messages.push({
                role: 'tool',
                content: {
                  tool_use_id: toolUse.id,
                  content: `执行失败: ${error.message}`,
                  is_error: true
                }
              });
              if (this.config.verbose) {
                console.log(`   ❌ ${toolUse.name}: ${error.message}`);
              }
            }
            continue;
          }
          
          if (answer !== 'y' && answer !== 'yes') {
            this.messages.push({
              role: 'tool',
              content: {
                tool_use_id: toolUse.id,
                content: `❌ 用户已取消操作。请继续其他任务。`,
                is_error: true
              }
            });
            continue;
          }
        }
        
        // 执行工具
        try {
          const result = await tool.execute(toolUse.input);
          this.messages.push({
            role: 'tool',
            content: {
              tool_use_id: toolUse.id,
              content: result.message,
              is_error: !result.success
            }
          });
          if (this.config.verbose) {
            console.log(`   ✅ ${toolUse.name}: ${result.message.slice(0, 100)}`);
          }
        } catch (error: any) {
          this.messages.push({
            role: 'tool',
            content: {
              tool_use_id: toolUse.id,
              content: `执行失败: ${error.message}`,
              is_error: true
            }
          });
          if (this.config.verbose) {
            console.log(`   ❌ ${toolUse.name}: ${error.message}`);
          }
        }
      }
      
      // 👇 进展检测：检查消息数量是否增加
      if (this.messages.length === this.lastMessageCount) {
        this.noProgressCount++;
        if (this.noProgressCount >= this.MAX_NO_PROGRESS) {
          return `⚠️ 长时间无进展（连续 ${this.MAX_NO_PROGRESS} 轮），已停止。请尝试更具体的指令。`;
        }
      } else {
        this.noProgressCount = 0;
        this.lastMessageCount = this.messages.length;
      }
      
      continue;
    }
    else {
      finalAnswer = response.content || "达到最大 token 限制，请继续。";
      break;
    }
  }
  
  return finalAnswer;
}
  
  getHistory(): any[] {
    return this.messages;
  }
  
  async reset(): Promise<void> {
    this.messages = [];
    await this.addSystemMessage();  // ✅ 加上 await
  }
  // 👇 新增这个方法
  private async askConfirmation(prompt?: string): Promise<string> {
  return new Promise((resolve) => {
    const message = prompt || '是否继续？';
    
    if (this.rl) {
      // 使用主 readline
      this.rl.question(`${message} (y/n) > `, (answer: string) => {
        resolve(answer.toLowerCase().trim());
      });
    } else {
      // 备用方案：创建临时 readline
      const tempRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      tempRl.question(`${message} (y/n) > `, (answer: string) => {
        tempRl.close();
        resolve(answer.toLowerCase().trim());
      });
    }
  });
}



  async saveSession(): Promise<void> {
  if (this.session) {
    await sessionManager.updateSession(this.session.id, this.messages);
    console.log(`💾 会话已保存: ${this.session.name}`);
  }
}
// 重命名当前会话
async renameSession(newName: string): Promise<boolean> {
  if (!this.session) {
    console.log('❌ 没有活动会话');
    return false;
  }
  
  const success = await sessionManager.renameSession(this.session.id, newName);
  if (success) {
    this.session.name = newName;
    console.log(`✅ 会话已重命名为: ${newName}`);
  } else {
    console.log(`❌ 重命名失败`);
  }
  return success;
}

// 删除会话
async deleteSession(sessionId: string): Promise<boolean> {
  // 不能删除当前会话
  if (this.sessionId === sessionId) {
    console.log(`❌ 不能删除当前会话，请先切换到其他会话`);
    return false;
  }
  
  const success = await sessionManager.deleteSession(sessionId);
  if (success) {
    console.log(`✅ 会话已删除: ${sessionId.slice(-8)}`);
  } else {
    console.log(`❌ 会话不存在: ${sessionId}`);
  }
  return success;
}

// 显示会话详情
async showSessionInfo(sessionId?: string): Promise<void> {
  const targetId = sessionId || this.sessionId;
  if (!targetId) {
    console.log('❌ 没有指定会话');
    return;
  }
  
  const session = await sessionManager.loadSession(targetId);
  if (!session) {
    console.log(`❌ 会话不存在: ${targetId}`);
    return;
  }
  
  const isCurrent = targetId === this.sessionId;
  console.log('\n📋 会话详情:');
  console.log(`   ID: ${session.id}`);
  console.log(`   名称: ${session.name}${isCurrent ? ' (当前)' : ''}`);
  console.log(`   消息数: ${session.messages.length}`);
  console.log(`   创建时间: ${session.createdAt.toLocaleString()}`);
  console.log(`   更新时间: ${session.updatedAt.toLocaleString()}`);
}
  // 获取当前会话信息
getSessionInfo(): { id: string; name: string; messageCount: number } | null {
  if (!this.session) return null;
  return {
    id: this.session.id,
    name: this.session.name,
    messageCount: this.messages.length
  };
 }
// 列出所有会话
async listSessions(): Promise<void> {
  const sessions = sessionManager.listSessions();
  console.log('\n📂 历史会话:');
  for (const s of sessions) {
    const current = s.id === this.sessionId ? ' (当前)' : '';
    console.log(`  ${s.id.slice(-8)}: ${s.name}${current} - ${s.messages.length}条消息`);
  }
  console.log('\n💡 提示：使用 /resume <简写ID> 恢复会话');
}

// 切换会话
async switchSession(sessionId: string): Promise<boolean> {
  // 1. 先尝试完整 ID 匹配
  let session = await sessionManager.loadSession(sessionId);
  
  // 2. 如果没找到，尝试用简写匹配（后8位）
  if (!session) {
    const sessions = sessionManager.listSessions();
    const match = sessions.find(s => s.id.slice(-8) === sessionId);
    if (match) {
      session = match;
    }
  }
  
  if (!session) return false;
  
  this.session = session;
  this.sessionId = session.id;
  this.messages = session.messages;
  console.log(`📂 切换到会话: ${session.name}`);
  return true;
}

}