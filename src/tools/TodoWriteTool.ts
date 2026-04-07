import { BaseTool, ToolInput, ToolOutput } from './base.js';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TodoWriteInput extends ToolInput {
  action: 'add' | 'update' | 'list' | 'clear' | 'replace';
  todos?: Array<{
    id?: string;
    content: string;
    status?: 'pending' | 'in_progress' | 'completed';
  }>;
}

// 简单的内存存储（按会话隔离）
const sessionTodos = new Map<string, TodoItem[]>();

function getSessionKey(agentId?: string): string {
  return agentId ?? 'main';
}

export class TodoWriteTool extends BaseTool<TodoWriteInput> {
  name = 'todo_write';
  
  description = `创建和管理任务列表。用于跟踪多步骤任务的进度。

使用时机：
- 任务需要 3 个以上步骤时
- 用户明确要求使用 todo 列表时

状态说明：
- pending: 未开始
- in_progress: 进行中（同时只有一个）
- completed: 已完成

操作：
- add: 添加新任务
- update: 更新任务状态
- list: 查看当前任务列表
- clear: 清空所有任务
- replace: 替换整个任务列表`;
  
  schema = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['add', 'update', 'list', 'clear', 'replace'],
        description: '操作类型'
      },
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '任务ID（更新时需要）' },
            content: { type: 'string', description: '任务内容' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
          }
        },
        description: '任务列表'
      }
    },
    required: ['action']
  };
  
  async execute(input: TodoWriteInput, context?: any): Promise<ToolOutput> {
    const sessionKey = getSessionKey(context?.agentId);
    let todos = sessionTodos.get(sessionKey) || [];
    
    switch (input.action) {
      case 'add':
        if (!input.todos || input.todos.length === 0) {
          return { success: false, message: '❌ 没有提供任务内容' };
        }
        for (const todo of input.todos) {
          const newTodo: TodoItem = {
            id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            content: todo.content,
            status: todo.status || 'pending'
          };
          todos.push(newTodo);
        }
        sessionTodos.set(sessionKey, todos);
        return {
          success: true,
          message: this.formatTodos(todos)
        };
        
      case 'update':
        if (!input.todos || input.todos.length === 0) {
          return { success: false, message: '❌ 没有提供要更新的任务' };
        }
        for (const update of input.todos) {
          const todo = todos.find(t => t.id === update.id);
          if (todo) {
            if (update.status) todo.status = update.status;
            if (update.content) todo.content = update.content;
          }
        }
        sessionTodos.set(sessionKey, todos);
        return {
          success: true,
          message: this.formatTodos(todos)
        };
        
      case 'list':
        return {
          success: true,
          message: this.formatTodos(todos)
        };
        
      case 'clear':
        sessionTodos.set(sessionKey, []);
        return {
          success: true,
          message: '✅ 已清空所有任务'
        };
        
      case 'replace':
        if (!input.todos) {
          return { success: false, message: '❌ 没有提供任务列表' };
        }
        const newTodos: TodoItem[] = input.todos.map((todo, idx) => ({
          id: todo.id || `todo_${Date.now()}_${idx}`,
          content: todo.content,
          status: todo.status || 'pending'
        }));
        sessionTodos.set(sessionKey, newTodos);
        return {
          success: true,
          message: this.formatTodos(newTodos)
        };
        
      default:
        return {
          success: false,
          message: `❌ 未知操作: ${input.action}`
        };
    }
  }
  
  private formatTodos(todos: TodoItem[]): string {
    if (todos.length === 0) {
      return '📋 任务列表为空';
    }
    
    const lines = ['📋 **当前任务列表**：'];
    for (const todo of todos) {
      const icon = todo.status === 'completed' ? '✅' :
                   todo.status === 'in_progress' ? '🔄' : '⭕';
      lines.push(`  ${icon} ${todo.content}`);
    }
    
    const pendingCount = todos.filter(t => t.status !== 'completed').length;
    const completedCount = todos.filter(t => t.status === 'completed').length;
    lines.push(`\n📊 进度: ${completedCount}/${todos.length} 已完成`);
    
    return lines.join('\n');
  }
  
  isReadOnly(): boolean {
    return false;
  }
}