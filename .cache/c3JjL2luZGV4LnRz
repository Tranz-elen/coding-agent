import readline from 'readline';
import { AgentLoop } from './agent/loop.js';
import { RateLimiter } from './utils/rateLimit.js';
import { loadConfig } from './utils/config.js';

// 存储命令历史
const history: string[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🤖 > ',
  historySize: 100,
  removeHistoryDuplicates: true
});

async function main() {
  const config = loadConfig();
  
  console.log('=================================');
  console.log('   Coding Agent - 阶段 5');
  console.log(`   模型: ${config.model}`);
  console.log('   输入 "exit" 或 "quit" 退出');
  console.log('   输入 "/sessions" 查看历史会话');
  console.log('   输入 "/resume <id>" 恢复会话');
  console.log('   输入 "/save" 保存当前会话');
  console.log('   输入 "/history" 查看命令历史');
  console.log('   ⬆ ⬇ 上下箭头查看命令历史');
  console.log('=================================\n');
  
  const rateLimiter = new RateLimiter(
    config.rateLimit.maxRequests,
    config.rateLimit.windowMs
  );
  let rateLimited = false;
  let rateLimitTimer: NodeJS.Timeout | null = null;

  const sessionId = process.argv[2];
  const agent = new AgentLoop({ 
    maxIterations: 15,
    verbose: true,
    sessionId
  });
  agent.setReadline(rl);
  
  rl.prompt();
  
  // 只有一个监听器
  rl.on('line', async (line) => {
    const input = line.trim();
    
    // 1. 退出命令
    if (input === 'exit' || input === 'quit') {
      console.log('再见！');
      rl.close();
      return;
    }

    // 2. 速率限制检查（合并）
    const isCommand = input.startsWith('/');
    if (!isCommand && !rateLimiter.checkLimit(sessionId || 'default')) {
      rateLimited = true;
      console.log('\n❌ 请求过于频繁（30次/分钟），请等待 60 秒\n');
      
      // 暂停 readline，阻止用户输入
      rl.pause();
      
      if (rateLimitTimer) clearTimeout(rateLimitTimer);
      rateLimitTimer = setTimeout(() => {
        rateLimited = false;
        console.log('✅ 限流解除，可以继续使用\n');
        rl.resume();
        rl.prompt();
      }, 60000);
      
      return;
    }
    
    // 3. 保存命令历史（非命令）
    if (input && !input.startsWith('/')) {
      const index = history.indexOf(input);
      if (index !== -1) history.splice(index, 1);
      history.unshift(input);
      if (history.length > 100) history.pop();
    }
    
    // 4. 处理各种命令
    if (input === '/sessions') {
      await agent.listSessions();
      rl.prompt();
      return;
    }
    
    if (input === '/save') {
      await agent.saveSession();
      rl.prompt();
      return;
    }
    
    if (input === '/history') {
      console.log('\n📜 命令历史（最近20条）:');
      for (let i = 0; i < Math.min(history.length, 20); i++) {
        console.log(`  ${i + 1}. ${history[i]}`);
      }
      console.log('');
      rl.prompt();
      return;
    }

   if (input === '/chat-history') {
  const history = agent.getHistory();
  console.log('\n📜 当前会话消息历史:\n');
  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    let displayContent = '';
    
    if (msg.role === 'user') {
      displayContent = msg.content;
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        displayContent = msg.content.slice(0, 200);
      } else if (Array.isArray(msg.content)) {
        // 提取工具调用信息
        const toolNames = msg.content.map((c: any) => c.name).join(', ');
        displayContent = `[调用工具: ${toolNames}]`;
      }
    } else if (msg.role === 'tool') {
      const result = msg.content.content || msg.content;
      displayContent = result.slice(0, 150);
    } else if (msg.role === 'system') {
      displayContent = msg.content.slice(0, 200);
    }
    
    const roleIcon = msg.role === 'user' ? '👤' : 
                     msg.role === 'assistant' ? '🤖' : 
                     msg.role === 'tool' ? '🔧' : '📋';
    
    console.log(`${i + 1}. ${roleIcon} [${msg.role}]`);
    console.log(`   ${displayContent}\n`);
  }
  console.log(`📊 总计: ${history.length} 条消息`);
  rl.prompt();
  return;
}
    
    if (input.startsWith('/resume ')) {
      const id = input.slice(8).trim();
      const success = await agent.switchSession(id);
      if (!success) {
        console.log(`❌ 会话不存在: ${id}`);
      }
      rl.prompt();
      return;
    }
    
    if (input.startsWith('/rename ')) {
      const newName = input.slice(8).trim();
      await agent.renameSession(newName);
      rl.prompt();
      return;
    }
    
    if (input.startsWith('/delete ')) {
      const id = input.slice(8).trim();
      await agent.deleteSession(id);
      rl.prompt();
      return;
    }
    
    if (input === '/session-info') {
      await agent.showSessionInfo();
      rl.prompt();
      return;
    }
    
    if (input === '') {
      rl.prompt();
      return;
    }
    
    // 5. 正常处理
    console.log('\n⏳ 处理中...\n');
    
    try {
      const response = await agent.processUserInput(input);
      console.log('\n📝 回答:\n');
      console.log(response);
      console.log('\n' + '-'.repeat(50) + '\n');
    } catch (error) {
      console.error('\n❌ 错误:', error);
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    process.exit(0);
  });
}

main().catch(console.error);