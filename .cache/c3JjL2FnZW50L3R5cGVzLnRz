// 消息角色
export type Role  = 'user' | 'assistant' | 'tool' | 'system';

// 工具调用
export interface ToolUse {
  id: string;           // 工具调用的唯一 ID
  name: string;         // 工具名称
  input: Record<string, any>;  // 工具参数
}

// 工具结果
export interface ToolResult {
  tool_use_id: string;  // 对应的 tool_use ID
  content: string;      // 执行结果
  is_error?: boolean;   // 是否出错
}

// 消息类型
export interface Message {
  role: Role;
  content: string | ToolUse[] | ToolResult;
}

// LLM 响应
export interface LLMResponse {
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
  content: string;           // 如果 stop_reason 是 end_turn
  tool_uses?: ToolUse[];     // 如果 stop_reason 是 tool_use
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}