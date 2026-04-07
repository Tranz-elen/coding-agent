import readline from 'readline';
import { AgentLoop } from './agent/loop.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🤖 > '
});

async function main() {
  console.log('=================================');
  console.log('   Coding Agent - 阶段 3');
  console.log('   输入 "exit" 或 "quit" 退出');
  console.log('   输入 "/sessions" 查看历史会话');
  console.log('   输入 "/resume <id>" 恢复会话');
  console.log('   输入 "/save" 保存当前会话');
  console.log('=================================\n');
  
  const sessionId = process.argv[2];
  const agent = new AgentLoop({ 
    maxIterations: 15,
    verbose: true,
    sessionId
  });
  agent.setReadline(rl);

  rl.prompt();
  
  rl.on('line', async (line) => {
  const input = line.trim();
  
  if (input === 'exit' || input === 'quit') {
    console.log('再见！');
    rl.close();
    return;
  }
  
  // 👇 这些命令必须在最前面，在任何其他处理之前
  if (input === '/sessions') {
    await agent.listSessions();
    rl.prompt();
    return;  // 必须要有 return
  }
  // 新增：重命名会话
if (input.startsWith('/rename ')) {
  const newName = input.slice(8).trim();
  if (newName) {
    await agent.renameSession(newName);
  } else {
    console.log('❌ 请提供新名称: /rename <新名称>');
  }
  rl.prompt();
  return;
}
// 新增：删除会话
if (input.startsWith('/delete ')) {
  const sessionId = input.slice(8).trim();
  await agent.deleteSession(sessionId);
  rl.prompt();
  return;
}

// 新增：显示会话详情
if (input === '/session-info') {
  await agent.showSessionInfo();
  rl.prompt();
  return;
}

if (input.startsWith('/session-info ')) {
  const sessionId = input.slice(13).trim();
  await agent.showSessionInfo(sessionId);
  rl.prompt();
  return;
}
  if (input === '/save') {
    await agent.saveSession();
    rl.prompt();
    return;  // 必须要有 return
  }
  
  if (input.startsWith('/resume ')) {
    const id = input.slice(8).trim();
    const success = await agent.switchSession(id);
    if (!success) {
      console.log(`❌ 会话不存在: ${id}`);
    }
    rl.prompt();
    return;  // 必须要有 return
  }
  
  if (input === '') {
    rl.prompt();
    return;
  }
  
  // 只有非命令才进入 Agent
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