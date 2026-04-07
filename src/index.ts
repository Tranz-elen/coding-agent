import readline from 'readline';
import { AgentLoop } from './agent/loop.js';

// 存储命令历史
const history: string[] = [];
let currentInput = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🤖 > ',
  historySize: 100,
  removeHistoryDuplicates: true
});

// 监听历史变化（readline 自带上下箭头，不需要手动实现）
// 只需要添加 /history 命令即可

async function main() {
  console.log('=================================');
  console.log('   Coding Agent - 阶段 5');
  console.log('   输入 "exit" 或 "quit" 退出');
  console.log('   输入 "/sessions" 查看历史会话');
  console.log('   输入 "/resume <id>" 恢复会话');
  console.log('   输入 "/save" 保存当前会话');
  console.log('   输入 "/history" 查看命令历史');
  console.log('   ⬆ ⬇ 上下箭头查看命令历史');
  console.log('=================================\n');
  
  const sessionId = process.argv[2];
  const agent = new AgentLoop({ 
    maxIterations: 15,
    verbose: true,
    sessionId
  });
  agent.setReadline(rl);
  
  // 保存命令历史（通过监听 line 事件）
  rl.on('line', (input) => {
    const trimmed = input.trim();
    if (trimmed && !trimmed.startsWith('/')) {
      // 添加到历史（去重）
      const index = history.indexOf(trimmed);
      if (index !== -1) history.splice(index, 1);
      history.unshift(trimmed);
      if (history.length > 100) history.pop();
    }
  });
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input === 'exit' || input === 'quit') {
      console.log('再见！');
      rl.close();
      return;
    }
    
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