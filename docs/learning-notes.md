
# 学习笔记

## Claude Code 源码分析

### 核心发现

1. **核心循环设计**
   - 使用 `while(true)` + `needsFollowUp` 标记
   - 流式输出使用 `AsyncGenerator`
   - 最大循环次数防止无限循环

2. **工具系统设计**
   - 统一的 `Tool` 接口
   - `buildTool` 工厂函数提供默认实现
   - 能力标记（isReadOnly, isConcurrencySafe）

3. **权限系统设计**
   - 多级权限（ALLOW/ASK/DENY）
   - 危险命令模式匹配
   - 用户确认机制

4. **会话管理设计**
   - JSONL 格式存储
   - 会话隔离（agentId）
   - 断点续传支持

### 关键代码位置

| 功能 | 文件路径 |
|------|----------|
| 核心循环 | `src/query.ts` |
| 工具接口 | `src/Tool.ts` |
| 工具注册 | `src/tools.ts` |
| Bash 工具 | `src/tools/BashTool/BashTool.tsx` |
| Todo 工具 | `src/tools/TodoWriteTool/TodoWriteTool.ts` |
| 权限检查 | `src/utils/permissions/permissions.ts` |
| 会话存储 | `src/state/sessionStore.ts` |

### 学到的设计模式

1. **异步生成器** - 用于流式输出
2. **单例模式** - 工具注册表、会话管理器
3. **工厂模式** - `buildTool` 创建工具
4. **策略模式** - 权限检查策略
5. **观察者模式** - 会话状态变化通知

### 与 Claude Code 的差异

| 功能 | Claude Code | 我们的实现 |
|------|-------------|------------|
| UI | React/Ink | 命令行文本 |
| MCP 协议 | 完整支持 | 未实现 |
| 多 Agent 协作 | 支持 | 未实现 |
| 权限持久化 | 保存到设置 | 仅内存 |

### 实现过程中的挑战

1. **输入重复问题** - PowerShell 编码问题，切换到 CMD 解决
2. **会话文件损坏** - 添加错误处理和自动备份
3. **readline 冲突** - 复用主 readline 而不是创建新实例
4. **API 消息格式错误** - 确保 tool_calls 和 tool 消息配对

### 后续可扩展的功能

- [ ] WebSearchTool（网络搜索）
- [ ] AskUserQuestionTool（询问用户）
- [ ] MCP 协议支持
- [ ] 多 Agent 协作
- [ ] 权限规则持久化

