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
- /chat-history - 查看对话历史
- /history - 查看命令历史


# 缓存系统

## 文件缓存 (L2)

用于缓存读取过的文件内容，避免重复读取磁盘。

### 存储位置
- `.cache/` 目录（项目根目录）
- 文件名使用 Base64 哈希，避免路径冲突

### 缓存策略
- **内存缓存**：快速访问，最多 50 个文件
- **磁盘缓存**：持久化存储，跨会话可用

## 缓存清理机制

### 清理策略
| 策略 | 参数 | 说明 |
|------|------|------|
| 时间清理 | 7 天 | 删除超过 7 天未使用的缓存 |
| 大小清理 | 100 MB | 超过限制时删除最旧的文件 |

### 触发时机
- Agent 启动时自动执行
- 可手动调用 `fileCache.cleanExpiredCache()` 和 `fileCache.limitCacheSize()`

### 代码示例
```typescript
// 清理过期缓存（7天）
await fileCache.cleanExpiredCache(7);

// 限制缓存大小（100MB）
await fileCache.limitCacheSize(100);
```

# 参考

- 本项目基于对 Claude Code 源码的学习：
- 核心循环：src/query.ts
- 工具系统：src/Tool.ts
- 权限系统：src/utils/permissions/
- 会话管理：src/state/sessionStore.ts
