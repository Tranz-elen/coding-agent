import { LLMClient } from '../api/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { sessionManager, type Session } from '../state/session.js'; 
import { permissionChecker } from '../permissions/checker.js';
import { PermissionMode } from '../permissions/types.js';
import readline from 'readline';
import { contextCompressor } from '../services/compact.js';
import { loadConfig } from '../utils/config.js'
import { fileCache } from '../services/fileCache.js';
import { sessionSummary } from '../services/sessionSummary.js';
import { toolOutputCache } from '../services/toolOutputCache.js';
import { agentMemoryAdapter } from '../memory/adapters/agent.js';
import { sessionMemoryAdapter } from '../memory/adapters/session.js';
import { toolMemoryAdapter } from '../memory/adapters/tool.js';
import { compressionAdapter } from '../memory/adapters/compression.js';
import { learningEngine } from '../memory/core/learning.js';
import { layeredStorage } from '../memory/core/storage.js';
import { feedbackProcessor } from '../memory/core/feedback.js';
import { logger } from '../utils/logger.js';
import { taskMemory } from '../memory/core/taskMemory.js';
import { parseMarkdownToKnowledge, parseListItems } from '../memory/utils/knowledgeParser.js';
import { knowledgeToStorageFormat } from '../memory/utils/knowledgeParser.js';

const config = loadConfig();

export interface AgentConfig {
  maxIterations?: number;
  verbose?: boolean;

  memory?: {
    enabled: boolean;
    storage?: {
      instanceRetentionDays: number;
      featureRetentionDays: number;
      symbolRetentionDays: number;
    };
    cognitive?: {
      importanceThreshold: number;
      noveltyWeight: number;
      relevanceWeight: number;
      userSignalWeight: number;
      entropyWeight: number;
    };
    reasoning?: {
      predictionConfidence: number;
      maxPredictions: number;
    };
    learning?: {
      explorationRate: number;
      learningRate: number;
    };
  };
}

export class AgentLoop {
  private llm: LLMClient;
  private toolRegistry: ToolRegistry;
  private messages: any[] = [];
  private config: AgentConfig;
  private session: Session | null = null;
  private sessionId: string | null = null;
  private rl: readline.Interface | null = null; 

  private lastToolCallKey: string = '';
  private sameToolCallCount: number = 0;
  private readonly MAX_SAME_CALL = 5;

  private lastMessageCount: number = 0;
  private noProgressCount: number = 0;
  private readonly MAX_NO_PROGRESS = 5;
  private shouldExtractTask: boolean = false;
  
  constructor(config?: AgentConfig & { sessionId?: string }) {
    this.llm = new LLMClient();
    this.toolRegistry = ToolRegistry.getInstance();
    const fileConfig = loadConfig();
    
    this.config = {
      maxIterations: config?.maxIterations ?? fileConfig.maxIterations,
      verbose: config?.verbose ?? fileConfig.verbose,
      memory: (config?.memory ?? (fileConfig as any).memory)
    };
    
    this.sessionId = config?.sessionId || null;
    this.initSession(this.sessionId);
    fileCache.cleanExpired();
  }

  setReadline(rlInstance: readline.Interface): void {
    this.rl = rlInstance;
    const askTool = this.toolRegistry.get('ask_user_question') as any;
    if (askTool && askTool.setReadline) {
      askTool.setReadline(rlInstance);
    }
    fileCache.cleanExpiredCache(7).catch(err => logger.error('清理过期缓存失败:', err));
    fileCache.limitCacheSize(100).catch(err => logger.error('限制缓存大小失败:', err));
  }

  private async addSystemMessage() {
    const systemPrompt = `你是一个专业的编程助手。

## ⚠️ 关于记忆的重要规则（必须遵守）
1. 当系统在对话中提供【记忆】信息时，这些信息是你已经知道的关于用户的事实。
2. 用户询问自己的信息（如名字、偏好）时，你必须直接使用【记忆】中的信息回答。
3. 严禁说"我不知道你的名字"、"我不清楚"、"你可以告诉我"这类话，因为记忆已经告诉你了。
4. 如果记忆中有相关信息，直接引用；如果没有，再礼貌地询问。

## 信息接收与执行规则（严格遵守）
1. 当用户只是同步信息、陈述事实，没有明确指令时：
   - 只回复："好的，我记住了。需要我做什么吗？"
   - **禁止**主动执行任何操作
2. 当用户使用以下指令词时，必须立即执行，不要再询问：
   - "帮我"、"请执行"、"开始规划"、"开始执行"、"规划一下"、"请开始"
   - "写一个"、"创建一个"、"帮我做"、"搜索"、"查找"
3. 如果你不确定，优先询问用户，但如果是明确指令，直接执行。

## 知识内化规则
当你通过搜索、阅读、整理获得新知识时，必须：
1. 将核心知识点提炼成简洁的陈述句
2. 存入你的长期记忆（使用内部记忆功能）
3. 这样你才能真正"学会"这些知识，下次直接使用
记住：写文件是给用户看的，存入记忆是给你自己学的。

## 对话上下文规则
当用户使用"按你说的"、"按你建议来"、"听你的"等代词指代时：
1. 优先查看最近的对话历史，找到你刚才给出的建议
2. 如果找不到，再询问用户具体指什么

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
    await this.saveCurrentSession();
  }

  private async initSession(sessionId?: string): Promise<void> {
    logger.info(`🔍 尝试恢复会话: ${sessionId}`);
    if (sessionId) {
      const session = await sessionManager.loadSession(sessionId);
      if (session) {
        this.session = session;
        this.sessionId = session.id;
        this.messages = session.messages;
        logger.info(`📂 恢复会话: ${session.name} (${this.sessionId})，消息数: ${this.messages.length}`);
        return;
      }
      
      logger.memory('尝试加载摘要:', sessionId);
      const summary = await sessionSummary.loadSummary(sessionId);
      logger.memory('摘要加载结果:', summary ? '成功' : '失败');
      
      if (summary) {
        logger.info(`📋 加载历史摘要: ${summary.sessionId.slice(-8)} (${new Date(summary.timestamp).toLocaleDateString()})`);
        
        let enhancedContent = `【重要】以下是之前会话的摘要，你已经知道这些信息，不需要重新探索。\n\n`;
        enhancedContent += `${summary.summary}\n\n`;
        
        if (summary.usefulInfo?.files && summary.usefulInfo.files.length > 0) {
          enhancedContent += `【已知文件】\n`;
          for (const file of summary.usefulInfo.files) {
            enhancedContent += `- ${file}\n`;
          }
          enhancedContent += `\n`;
        }
        
        if (summary.keyInfo?.pendingTasks && summary.keyInfo.pendingTasks.length > 0) {
          enhancedContent += `【待办任务】\n`;
          for (const task of summary.keyInfo.pendingTasks) {
            enhancedContent += `- ${task}\n`;
          }
          enhancedContent += `\n`;
        }
        
        if (summary.keyInfo?.completedWork && summary.keyInfo.completedWork.length > 0) {
          enhancedContent += `【已完成工作】\n`;
          for (const work of summary.keyInfo.completedWork.slice(0, 5)) {
            enhancedContent += `- ${work}\n`;
          }
          enhancedContent += `\n`;
        }
        
        enhancedContent += `【直接回答用户问题，不要执行 dir、grep、read_file 等探索命令。】`;
        
        this.messages.push({
          role: 'system',
          content: enhancedContent
        });
        
        this.sessionId = sessionId;
        this.session = await sessionManager.createSession('恢复的会话', this.messages);
        return;
      }
    } 
    
    this.session = await sessionManager.createSession('新会话', []);
    this.sessionId = this.session.id;
    logger.memory('准备添加系统消息...');
    await this.addSystemMessage();
    logger.memory('系统消息已添加，消息数:', this.messages.length);
    logger.info(`📝 新会话: ${this.sessionId}`);
  }

  private async saveCurrentSession(): Promise<void> {
    if (this.session) {
      await sessionManager.updateSession(this.session.id, this.messages);
    }
  }
  
  async processUserInput(userInput: string): Promise<string> {
  logger.memory('准备存储用户输入:', userInput);
  if (agentMemoryAdapter) {
    await agentMemoryAdapter.onUserInput(userInput);
  }
  
  this.messages.push({
    role: 'user',
    content: userInput
  });
  
  // ========== 1. 检测任务意图（在调用 LLM 之前） ==========
  const taskIntent = this.detectTaskIntent(userInput);
  
  if (taskIntent === 'start' || taskIntent === 'continue') {
    const currentTask = taskMemory.getCurrentTask();
    if (currentTask) {
      const taskContext = taskMemory.getTaskContext();
      if (taskContext) {
        this.messages.push({
          role: 'system',
          content: `【当前任务】用户正在执行以下任务，请基于任务规划开展工作：\n\n${taskContext}\n\n请根据当前步骤继续推进。如果某些步骤还没有详细方法，请先生成详细方法。`
        });
      }
    }
  }
  
  if (userInput.includes('规划') || userInput.includes('计划') || userInput.includes('步骤')) {
    this.shouldExtractTask = true;
  }
  
  // ========== 2. 调用 LLM ==========
  let iteration = 0;
  let finalAnswer = '';
  
  while (true) {
    if (contextCompressor.needsCompression(this.messages)) {
      logger.info('\n📦 上下文过长，正在压缩...');
      this.messages = await contextCompressor.compress(this.messages, this.sessionId || undefined);
      await this.saveCurrentSession();
      logger.info('✅ 压缩完成，继续处理...\n');
    }
    
    if (this.config.verbose) {
      logger.info(`\n🔄 继续处理...`);
    }
    
    // 记忆检索注入
    if (this.config.memory?.enabled) {
      try {
        const relevantMemories = await layeredStorage.retrieve({
          query: userInput,
          limit: 3,
          minSignificance: 0  
        });
        
        if (relevantMemories.length > 0) {
          logger.memory('检索到相关记忆:', relevantMemories.length, '条');
          
          const memoryTexts: string[] = [];
          relevantMemories.forEach((m, i) => {
            let text = '';
            if (typeof m.content === 'string') {
              text = m.content;
            } else if (m.content?.content) {
              text = m.content.content;
            } else if (m.content?.type === 'user_input' && m.content?.content) {
              text = m.content.content;
            } else {
              text = JSON.stringify(m.content);
            }
            text = text.replace(/^"|"$/g, '').replace(/\\"/g, '"');
            memoryTexts.push(text);
            logger.memory(`记忆 ${i+1}:`, text.substring(0, 100));
          });
          
          const uniqueTexts = [...new Set(memoryTexts)];
          const facts = uniqueTexts.map(t => `- ${t}`).join('\n');
          
          this.messages.push({
            role: 'user',
            content: `【系统指令】你的记忆库中有以下关于用户的信息，请牢记并在回答中使用：\n${facts}\n\n请根据这些信息回答用户刚才的问题。`
          });
          logger.memory('记忆已注入');
        } else {
          logger.memory('未检索到相关记忆');
        }
      } catch (error) {
        logger.error('记忆检索失败:', error);
      }
    }

    // 避雷区提示
    const avoidZoneStats = feedbackProcessor.getAvoidZoneStats();
    if (avoidZoneStats.total > 0) {
      const avoidPatterns = avoidZoneStats.patterns
        .slice(0, 5)
        .map(p => `- 避免: "${p.pattern}" (原因: ${p.reason})`)
        .join('\n');
      
      this.messages.push({
        role: 'system',
        content: `【避雷提示】以下内容是用户之前表示过不喜欢或纠正过的，请在回答时主动避免使用类似的表达：\n${avoidPatterns}\n\n请确保你的回答不会包含这些内容或类似的表达。`
      });
      
      logger.feedback('避雷区提示已注入:', avoidZoneStats.total, '条');
    }

    const tools = this.toolRegistry.getLLMToolDefinitions();
    
    if (this.config.verbose) {
      logger.info('📡 调用 LLM...');
    }
    
    const response = await this.llm.chat(this.messages, tools);
    
    if (this.config.verbose) {
      logger.info(`📥 响应类型: ${response.stopReason}`);
      logger.info(`📊 Token 使用: 输入=${response.usage.inputTokens}, 输出=${response.usage.outputTokens}`);
    }
    
    if (response.stopReason === 'end_turn') {
      finalAnswer = response.content;
      this.messages.push({
        role: 'assistant',
        content: response.content
      });
      
      // ========== 3. 提取任务（在收到回复后） ==========
      if (this.shouldExtractTask) {
        await this.extractTaskFromResponse(response.content, userInput);
        this.shouldExtractTask = false;
      }
      
      if (this.config.memory?.enabled && agentMemoryAdapter) {
        await agentMemoryAdapter.onAgentResponse(response.content);
      }
      await this.saveCurrentSession();
      break;
    } 
    else if (response.stopReason === 'tool_use' && response.toolUses) {
      if (this.config.verbose) {
        logger.info(`🔧 执行 ${response.toolUses.length} 个工具:`);
        response.toolUses.forEach(tool => {
          logger.info(`   - ${tool.name}:`, JSON.stringify(tool.input).slice(0, 100));
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
        const toolCallKey = `${toolUse.name}_${JSON.stringify(toolUse.input)}`;
        if (toolCallKey === this.lastToolCallKey) {
          this.sameToolCallCount++;
          if (this.sameToolCallCount >= this.MAX_SAME_CALL) {
            const errorMsg = `⚠️ 检测到循环调用：工具 "${toolUse.name}" 连续 ${this.MAX_SAME_CALL} 次使用相同参数。请检查任务规划。`;
            this.messages.push({
              role: 'tool',
              content: { tool_use_id: toolUse.id, content: errorMsg, is_error: true }
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
            content: { tool_use_id: toolUse.id, content: `错误: 工具 "${toolUse.name}" 不存在`, is_error: true }
          });
          await this.saveCurrentSession();
          continue;
        }
        
        const permission = await permissionChecker.checkPermission(
          { toolName: toolUse.name, input: toolUse.input },
          this.sessionId || undefined
        );
        
        if (!permission.allowed) {
          this.messages.push({
            role: 'tool',
            content: { tool_use_id: toolUse.id, content: `⛔ 权限拒绝: ${permission.reason || '操作不被允许'}`, is_error: true }
          });
          continue;
        }
        
        if (permission.needConfirm && permission.mode === PermissionMode.ASK) {
          logger.info(`\n⚠️ 需要确认: ${permission.reason || '请确认此操作'}`);
          logger.info(`   工具: ${toolUse.name}`);
          logger.info(`   参数: ${JSON.stringify(toolUse.input, null, 2)}`);
          
          const answer = await this.askConfirmation();
          
          if (answer === '记住' || answer === 'remember') {
            await permissionChecker.addPersistedRule(
              this.sessionId || 'default', toolUse.name, PermissionMode.ALLOW,
              `用户已记住: ${toolUse.name}`, 7 * 24 * 60 * 60 * 1000
            );
            logger.info(`✅ 已记住 ${toolUse.name}，后续不再询问`);
          } else if (answer !== 'y' && answer !== 'yes') {
            this.messages.push({
              role: 'tool',
              content: { tool_use_id: toolUse.id, content: `❌ 用户已取消操作。`, is_error: true }
            });
            continue;
          }
        }
        
        try {
          const result = await tool.execute(toolUse.input);
          this.messages.push({
            role: 'tool',
            content: { tool_use_id: toolUse.id, content: result.message, is_error: !result.success }
          });
          if (this.config.verbose) {
            logger.info(`   ✅ ${toolUse.name}: ${result.message.slice(0, 100)}`);
          }
          // 如果是 write_file 且是知识库文件，提取知识
          if (toolUse.name === 'write_file' && result.success) {
            const filePath = toolUse.input.file_path;
            const content = toolUse.input.content;
            
            if (filePath.includes('知识库') || filePath.includes('knowledge') || filePath.endsWith('.md')) {
              await this.extractAndStoreKnowledge(content, filePath);
            }
          }


        } catch (error: any) {
          this.messages.push({
            role: 'tool',
            content: { tool_use_id: toolUse.id, content: `执行失败: ${error.message}`, is_error: true }
          });
          if (this.config.verbose) {
            logger.info(`   ❌ ${toolUse.name}: ${error.message}`);
          }
        }

      }
      
      if (this.messages.length === this.lastMessageCount) {
        this.noProgressCount++;
        if (this.noProgressCount >= this.MAX_NO_PROGRESS) {
          return `⚠️ 长时间无进展（连续 ${this.MAX_NO_PROGRESS} 轮），已停止。`;
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
    await this.addSystemMessage();
  }

  private async askConfirmation(prompt?: string): Promise<string> {
    return new Promise((resolve) => {
      const message = prompt || '是否继续？';
      
      if (this.rl) {
        this.rl.question(`${message} (y/n) > `, (answer: string) => {
          resolve(answer.toLowerCase().trim());
        });
      } else {
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

  private detectTaskIntent(input: string): 'start' | 'continue' | 'next' | 'stop' | null {
  const lower = input.toLowerCase();
  if (lower.includes('开始执行') || lower.includes('开始做') || lower.includes('启动')) return 'start';
  if (lower.includes('继续') || lower.includes('接着')) return 'continue';
  if (lower.includes('下一步') || lower.includes('然后')) return 'next';
  if (lower.includes('暂停') || lower.includes('停止') || lower.includes('取消')) return 'stop';
  return null;
}

private async extractTaskFromResponse(response: string, userGoal: string): Promise<void> {
  if (response.length < 200) return;
  
  const planningKeywords = ['步骤', '第一', '第二', '第三', '1.', '2.', '3.'];
  const hasPlanning = planningKeywords.some(kw => response.includes(kw));
  if (!hasPlanning) return;
  
  const titleMatch = response.match(/##\s*(.+?)(?:\n|$)/);
  const title = titleMatch ? titleMatch[1] : userGoal.substring(0, 30);
  
  const steps = taskMemory.extractStepsFromResponse(response);
  if (steps.length === 0) return;
  
  const task = await taskMemory.createTask(title, userGoal, steps, response);
  await taskMemory.activateTask(task.id);
  
  logger.info(`📋 任务已从回复中提取并激活: ${task.title}`);
}

// 👇 把新方法放在这里
  /**
   * 从 Markdown 内容中提取并存储知识
   */
  private async extractAndStoreKnowledge(content: string, filePath: string): Promise<void> {
    logger.info(`📚 开始从 ${filePath} 提取知识...`);
    
    const currentTask = taskMemory.getCurrentTask();
    
    // 1. 按标题解析知识点
    const headingItems = parseMarkdownToKnowledge(content);
    
    // 2. 按列表项解析知识点
    const listItems = parseListItems(content);
    
    // 3. 合并去重
    const allItems = [...headingItems, ...listItems];
    const uniqueItems = allItems.filter((item, index, self) => 
      index === self.findIndex(i => i.title === item.title)
    );
    
    let storedCount = 0;
    
    for (const item of uniqueItems) {
      // 跳过内容太短的知识点
      if (item.content.length < 20) continue;
      
      const formattedContent = knowledgeToStorageFormat(item);
      
      await layeredStorage.createKnowledgeInstance(
        item.title,
        formattedContent,
        item.tags,
        currentTask?.id,
        currentTask?.steps[currentTask.currentStepIndex]?.id
      );
      
      storedCount++;
    }
    
    logger.info(`📚 知识提取完成，共存储 ${storedCount} 条知识`);
  }

  async saveSession(): Promise<void> {
    if (this.session) {
      await sessionManager.updateSession(this.session.id, this.messages);
      logger.info(`💾 会话已保存: ${this.session.name}`);
    }
  }

  async renameSession(newName: string): Promise<boolean> {
    if (!this.session) {
      logger.info('❌ 没有活动会话');
      return false;
    }
    
    const success = await sessionManager.renameSession(this.session.id, newName);
    if (success) {
      this.session.name = newName;
      logger.info(`✅ 会话已重命名为: ${newName}`);
    } else {
      logger.info(`❌ 重命名失败`);
    }
    return success;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (this.sessionId === sessionId) {
      logger.info(`❌ 不能删除当前会话，请先切换到其他会话`);
      return false;
    }
    
    const success = await sessionManager.deleteSession(sessionId);
    if (success) {
      logger.info(`✅ 会话已删除: ${sessionId.slice(-8)}`);
    } else {
      logger.info(`❌ 会话不存在: ${sessionId}`);
    }
    return success;
  }

  async showSessionInfo(sessionId?: string): Promise<void> {
    const targetId = sessionId || this.sessionId;
    if (!targetId) {
      logger.info('❌ 没有指定会话');
      return;
    }
    
    const session = await sessionManager.loadSession(targetId);
    if (!session) {
      logger.info(`❌ 会话不存在: ${targetId}`);
      return;
    }
    
    const isCurrent = targetId === this.sessionId;
    logger.info('\n📋 会话详情:');
    logger.info(`   ID: ${session.id}`);
    logger.info(`   名称: ${session.name}${isCurrent ? ' (当前)' : ''}`);
    logger.info(`   消息数: ${session.messages.length}`);
    logger.info(`   创建时间: ${session.createdAt.toLocaleString()}`);
    logger.info(`   更新时间: ${session.updatedAt.toLocaleString()}`);
  }

  getSessionInfo(): { id: string; name: string; messageCount: number } | null {
    if (!this.session) return null;
    return {
      id: this.session.id,
      name: this.session.name,
      messageCount: this.messages.length
    };
  }

  async listSessions(): Promise<void> {
    const sessions = sessionManager.listSessions();
    logger.info('\n📂 历史会话:');
    for (const s of sessions) {
      const current = s.id === this.sessionId ? ' (当前)' : '';
      logger.info(`  ${s.id.slice(-8)}: ${s.name}${current} - ${s.messages.length}条消息`);
    }
    logger.info('\n💡 提示：使用 /resume <简写ID> 恢复会话');
  }

  async switchSession(sessionId: string): Promise<boolean> {
    let session = await sessionManager.loadSession(sessionId);
    
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
    logger.info(`📂 切换到会话: ${session.name}`);
    return true;
  }
}