从零构建一个 Coding Agent：学习 Claude Code 的实践（二）
一、概述
在上篇文章中，我们完成了 Agent 的核心框架和基础工具。本文主要介绍后续的功能完善和优化，包括会话管理增强、输出截断、安全措施、上下文压缩优化等。

项目地址：https://github.com/Tranz-elen/coding-agent

二、核心循环优化
2.1 问题
之前的版本使用固定的 maxIterations 限制（20次）。复杂任务（如生成贪吃蛇游戏）需要 30+ 次工具调用，经常被截停。

2.2 解决方案
移除硬性上限，改为动态进展检测：

typescript
while (true) {
  // 每次循环检查压缩
  if (needsCompression()) { await compress(); }
  
  // 调用 LLM、执行工具...
  
  // 进展检测：连续5轮无进展才停止
  if (noProgressCount >= 5) { return; }
}
2.3 效果
版本	循环方式	停止条件
之前	固定上限	达到20次
现在	无限循环	连续5轮无进展
三、会话管理增强
3.1 简写恢复会话
问题：会话 ID 很长（如 session_1775552561058_ozij4e），手动输入不便。

解决：支持用后 8 位简写恢复。

bash
# 之前
/resume session_1775552561058_ozij4e

# 现在
/resume ozij4e
3.2 查看对话历史
新增 /chat-history 命令，查看当前会话的所有消息。

text
📜 当前会话消息历史:

1. 👤 [user]
   帮我创建一个贪吃蛇游戏

2. 🤖 [assistant]
   [调用工具: todo_write, write_file]

3. 🔧 [tool]
   ✅ 成功写入 snake_game.html
3.3 会话命令汇总
命令	功能
/sessions	查看所有会话（显示简写）
/resume <简写>	恢复会话
/rename <名称>	重命名会话
/delete <id>	删除会话
/session-info	查看会话详情
/chat-history	查看对话历史
四、输出截断
4.1 背景
读取大文件或执行长输出命令时，返回内容会消耗大量 token。

4.2 实现
工具	阈值	策略
read_file	5000 字符	保留前50行 + 后20行
bash	10000 字符	超出则截断并提示
typescript
// read_file 截断示例
if (result.length > MAX_OUTPUT_SIZE) {
  const head = lines.slice(0, 50).join('\n');
  const tail = lines.slice(-20).join('\n');
  result = `${head}\n\n... (中间省略 X 行) ...\n\n${tail}`;
}
4.3 效果
Token 消耗显著降低

保留关键信息（开头和结尾）

用户可配合 offset/limit 分批获取完整内容

五、安全措施
5.1 敏感文件保护
禁止读取以下文件/目录：

.env（环境变量）

.git/（版本历史）

package-lock.json（依赖锁定）

~/.ssh、~/.aws（密钥）

5.2 敏感命令检测
typescript
const sensitiveCommands = [
  { pattern: /type\s+\.env/i, msg: '禁止读取 .env 文件' },
  { pattern: /cat\s+\.env/i, msg: '禁止读取 .env 文件' },
  // ...
];
5.3 其他限制
限制项	阈值
命令长度	最大 2000 字符
文件大小	最大 1MB
请求频率	30次/分钟，超限暂停60秒
六、上下文压缩优化
6.1 问题
压缩后消息格式出现错误：tool 消息没有对应的 tool_calls。

6.2 原因
压缩时只保留了最近 5 条消息，可能以 tool 消息开头，破坏了配对关系。

6.3 解决
typescript
// 如果最近消息以 tool 开头，往前找到对应的 assistant
if (recent[0].role === 'tool') {
  for (let i = ...; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      recent = [messages[i], ...recent];
      break;
    }
  }
}
6.4 配置调整
参数	之前	现在
触发阈值	32000 token	50000 token
保留消息数	5 条	8 条
检查时机	仅用户输入	每次循环
七、新增工具
7.1 ask_user_question
向用户提问并等待回答，支持多问题和选项。

typescript
// 使用示例
ask_user_question({
  questions: [
    { question: "你更喜欢哪个颜色？", options: ["红", "绿", "蓝"] }
  ]
})
7.2 web_search
网络搜索功能，支持 Gemini API 优先，Tavily 降级。

typescript
// 使用示例
web_search({ query: "TypeScript 教程", max_results: 5 })
八、踩过的坑
问题	解决方案
固定循环上限卡任务	改为无限循环 + 动态进展检测
压缩消息格式错误	保留最近消息，确保 tool/tool_calls 配对
会话简写恢复不了	loadSession 支持后8位匹配
输出太长费 token	添加截断（头50行 + 尾20行）
PowerShell $_ 变量报错	使用 `$_ 转义 |
九、后续计划
优先级	功能	状态
P1	错误重试机制	待实现
P2	进度显示优化	待实现
P2	配置文件支持	待实现
P3	MCP 协议支持	待实现
十、相关链接
GitHub：https://github.com/Tranz-elen/coding-agent

上一篇：[从零构建一个 Coding Agent：学习 Claude Code 的实践（一）]