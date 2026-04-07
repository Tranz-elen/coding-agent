export enum PermissionMode {
  ALLOW = 'allow',
  ASK = 'ask',
  DENY = 'deny'
}

export interface PermissionRule {
  id?: string;
  tool: string;
  mode: PermissionMode;
  reason?: string;
  expiresAt?: Date;
}

export interface PermissionRequest {
  toolName: string;
  input: any;
  context?: Record<string, any>;
}

export interface PermissionResult {
  allowed: boolean;
  mode: PermissionMode;
  reason?: string;
  needConfirm?: boolean;
}

export enum DangerLevel {
  SAFE = 'safe',
  CAUTION = 'caution',
  DANGEROUS = 'danger'
}

export const TOOL_CATEGORIES = {
  READ_ONLY: ['read_file', 'glob', 'grep', 'web_fetch', 'list_files'],
  FILE_WRITE: ['write_file', 'file_edit', 'delete_file'],
  COMMAND: ['bash', 'powershell'],
  TASK: ['todo_write'],
  NETWORK: ['web_fetch']
} as const;

export const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+-rf/, level: DangerLevel.DANGEROUS, message: '递归强制删除' },
  { pattern: /del\s+\/f/, level: DangerLevel.DANGEROUS, message: '强制删除文件' },
  { pattern: /format\s+[a-z]:/, level: DangerLevel.DANGEROUS, message: '格式化磁盘' },
  { pattern: /rd\s+\/s/, level: DangerLevel.DANGEROUS, message: '递归删除目录' },
  { pattern: /DROP\s+DATABASE/i, level: DangerLevel.DANGEROUS, message: '删除数据库' },
  { pattern: /TRUNCATE\s+TABLE/i, level: DangerLevel.CAUTION, message: '清空数据表' },
  { pattern: /sudo/, level: DangerLevel.CAUTION, message: '管理员权限' }
];

// 添加持久化权限规则
export interface PersistedPermissionRule {
  tool: string;           // 工具名称
  mode: PermissionMode;   // allow/ask/deny
  reason?: string;        // 原因
  createdAt: number;      // 创建时间戳
  expiresAt?: number;     // 过期时间戳（可选）
}

// 会话权限状态
export interface SessionPermissions {
  rules: PersistedPermissionRule[];
  sessionId: string;
  updatedAt: number;
}