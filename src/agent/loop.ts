import { LLMClient } from '../api/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { sessionManager, type Session } from '../state/session.js'; 
import { permissionChecker } from '../permissions/checker.js';
import { PermissionMode } from '../permissions/types.js';
import readline from 'readline';

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
  
  constructor(config?: AgentConfig & { sessionId?: string }) {
    this.llm = new LLMClient();
    this.toolRegistry = ToolRegistry.getInstance();
    this.config = {
      maxIterations: config?.maxIterations || 20,
      verbose: config?.verbose || false
    };
    
    this.sessionId = config?.sessionId || null;
    this.initSession(this.sessionId);
  }
  setReadline(rlInstance: readline.Interface): void {
  this.rl = rlInstance;
  const askTool = this.toolRegistry.get('ask_user_question') as any;
  if (askTool && askTool.setReadline) {
    askTool.setReadline(rlInstance);
  }
}
  private async addSystemMessage() {
  const systemPrompt = `你是一个专业的编程助手。

## 可用工具
${this.toolRegistry.getAll().map(tool => 
  `- ${tool.name}: ${tool.description}`
).join('\n')}

## 重要规则

1. **直接响应**：用户说"执行 X"时，直接调用 bash 执行，不要先探索
2. **Todo 列表**：当任务需要 3 个以上步骤时，先用 todo_write 创建任务列表
3. **Windows 环境**：使用 dir 而不是 ls
4. 当用户取消某个操作时，继续处理其他任务
5. 不要因为一个操作被取消而完全停止
6. 直接回复用户操作结果

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
    this.messages.push({
      role: 'user',
      content: userInput
    });
    
    let iteration = 0;
    let finalAnswer = '';
    
    while (iteration < this.config.maxIterations!) {
      iteration++;
      
      if (this.config.verbose) {
        console.log(`\n🔄 循环 #${iteration}`);
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
      
      if (response.stopReason === 'end_turn') {
        finalAnswer = response.content;
        
        this.messages.push({
          role: 'assistant',
          content: response.content
        });
        await this.saveCurrentSession();
        break;
      } 
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
        
        for (const toolUse of response.toolUses!) {
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
          
          // 👇 新增：权限检查
  const permission = await permissionChecker.checkPermission({
    toolName: toolUse.name,
    input: toolUse.input
  });
  
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
    console.log(`   是否继续？(y/n)`);
    
    // 等待用户输入
    const answer = await this.askConfirmation();
    if (answer !== 'y' && answer !== 'yes') {
  this.messages.push({
    role: 'tool',
    content: {
      tool_use_id: toolUse.id,
      content: `❌ 用户已取消操作。请继续其他任务。`,
      is_error: true
    }
  });
  continue;  // 👈 跳过当前工具，继续处理下一个工具
}
}
    
    // 可选：添加临时规则，本次会话不再询问
    // permissionChecker.addTempRule(toolUse.name, PermissionMode.ALLOW, '用户已确认');
  
          
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
        
        continue;
      }
      else {
        finalAnswer = response.content || "达到最大 token 限制，请继续。";
        break;
      }
    }
    
    if (iteration >= this.config.maxIterations!) {
      finalAnswer = "已达到最大循环次数。请简化请求或检查是否有循环调用。";
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
}

// 切换会话
async switchSession(sessionId: string): Promise<boolean> {
  const session = await sessionManager.loadSession(sessionId);
  if (!session) return false;
  
  this.session = session;
  this.sessionId = session.id;
  this.messages = session.messages;
  console.log(`📂 切换到会话: ${session.name}`);
  return true;
}

}