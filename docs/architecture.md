# 架构设计

## 核心循环

参考 Claude Code 的 `query.ts` 实现：

```typescript
while (iteration < maxIterations) {
  const response = await llm.chat(messages, tools);
  
  let needsFollowUp = false;
  if (response.stopReason === 'tool_use') {
    needsFollowUp = true;
  }
  
  if (!needsFollowUp) {
    return response.content;
  }
  
  // 执行工具
  for (const toolUse of response.toolUses) {
    const result = await tool.execute(toolUse.input);
    messages.push({ role: 'tool', content: result });
  }
}
```

# 工具系统

## 工具接口

- name: 工具名称
- description: 给 LLM 的描述
- schema: 参数 JSON Schema
- execute(): 执行逻辑
- isReadOnly(): 是否只读

## 工具注册表

- 单例模式
- 统一管理所有工具
- 提供 LLM 格式转换

# 权限系统

## 权限级别

- ALLOW: 自动允许（只读操作）
- ASK: 需要确认（写入、命令执行）
- DENY: 自动拒绝（危险命令）

## 危险模式检测

- 正则匹配匹配危险命令（rm -rf, del /f, format 等）
- 系统路径保护
- 用户确认机制

# 会话管理

## 存储

- JSON 文件存储到 sessions/ 目录
- 每个会话独立文件

## 会话命令

- /sessions - 列表
- /save - 保存
- /resume <id> - 恢复
- /rename <name> - 重命名
- /delete <id> - 删除
- /session-info - 详情

# 参考

- 本项目基于对 Claude Code 源码的学习：
- 核心循环：src/query.ts
- 工具系统：src/Tool.ts
- 权限系统：src/utils/permissions/
- 会话管理：src/state/sessionStore.ts

