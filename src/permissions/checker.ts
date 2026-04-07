import { 
  PermissionMode, 
  PermissionRule, 
  PermissionRequest, 
  PermissionResult, 
  DangerLevel, 
  DANGEROUS_PATTERNS,
  PersistedPermissionRule,
  SessionPermissions
} from './types.js';
import fs from 'fs/promises';
import path from 'path';

export class PermissionChecker {
  private rules: PermissionRule[] = [];
  private tempRules: Map<string, PermissionRule> = new Map(); // 临时规则（会话级别）
  private persistedRules: Map<string, PersistedPermissionRule[]> = new Map();
  private permissionsDir: string;

  constructor() {
    this.initDefaultRules();
    this.permissionsDir = path.join(process.cwd(), '.permissions');
    this.loadPersistedRules();
  }
   // 加载持久化的权限规则
  private async loadPersistedRules(): Promise<void> {
    try {
      await fs.mkdir(this.permissionsDir, { recursive: true });
      const files = await fs.readdir(this.permissionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.permissionsDir, file), 'utf-8');
          const sessionPerm: SessionPermissions = JSON.parse(content);
          this.persistedRules.set(sessionPerm.sessionId, sessionPerm.rules);
        }
      }
    } catch (error) {
      // 忽略加载错误
    }
  }
  
    // 保存权限规则到文件
  private async savePersistedRules(sessionId: string): Promise<void> {
    const rules = this.persistedRules.get(sessionId) || [];
    const sessionPerm: SessionPermissions = {
      rules,
      sessionId,
      updatedAt: Date.now()
    };
    const filePath = path.join(this.permissionsDir, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(sessionPerm, null, 2));
  }

    // 添加持久化规则（针对当前会话）
  async addPersistedRule(
    sessionId: string, 
    toolName: string, 
    mode: PermissionMode, 
    reason?: string,
    duration?: number  // 有效期（毫秒），默认永久
  ): Promise<void> {
    let rules = this.persistedRules.get(sessionId) || [];
    
    // 移除相同工具的旧规则
    rules = rules.filter(r => r.tool !== toolName);
    
    const newRule: PersistedPermissionRule = {
      tool: toolName,
      mode,
      reason,
      createdAt: Date.now(),
      expiresAt: duration ? Date.now() + duration : undefined
    };
    
    rules.push(newRule);
    this.persistedRules.set(sessionId, rules);
    await this.savePersistedRules(sessionId);
  }
  
  // 获取会话的持久化规则
  getPersistedRules(sessionId: string): PersistedPermissionRule[] {
    const rules = this.persistedRules.get(sessionId) || [];
    const now = Date.now();
    
    // 过滤掉过期的规则
    return rules.filter(r => !r.expiresAt || r.expiresAt > now);
  }


  // 初始化默认规则
  private initDefaultRules(): void {
  // 只读工具 - 自动允许
  const readOnlyTools = ['read_file', 'glob', 'grep', 'web_fetch', 'list_files'];
  for (const tool of readOnlyTools) {
    this.addRule({
      tool,
      mode: PermissionMode.ALLOW,
      reason: '只读操作，安全'
    });
  }
  
  // 任务工具 - 自动允许
  const taskTools = ['todo_write'];
  for (const tool of taskTools) {
    this.addRule({
      tool,
      mode: PermissionMode.ALLOW,
      reason: '任务管理'
    });
  }
  
  // 文件写入 - 需要确认
  const fileWriteTools = ['write_file', 'file_edit', 'delete_file'];
  for (const tool of fileWriteTools) {
    this.addRule({
      tool,
      mode: PermissionMode.ASK,
      reason: '修改文件内容'
    });
  }
  
  // 命令执行 - 需要确认
  const commandTools = ['bash', 'powershell'];
  for (const tool of commandTools) {
    this.addRule({
      tool,
      mode: PermissionMode.ASK,
      reason: '执行系统命令'
    });
  }
}
  
  // 添加规则
  addRule(rule: PermissionRule): void {
    this.rules.push(rule);
  }
  
  // 添加临时规则（本次会话有效）
  addTempRule(toolName: string, mode: PermissionMode, reason?: string): void {
    const key = `${toolName}_${Date.now()}`;
    this.tempRules.set(key, {
      tool: toolName,
      mode,
      reason
    });
  }
  
  // 检查权限
  async checkPermission(
    request: PermissionRequest, 
    sessionId?: string
  ): Promise<PermissionResult> {
    const { toolName, input } = request;

 // 0. 检查持久化规则（优先）
    if (sessionId) {
      const persisted = this.getPersistedRules(sessionId);
      for (const rule of persisted) {
        if (this.matchTool(rule.tool, toolName)) {
          switch (rule.mode) {
            case PermissionMode.ALLOW:
              return {
                allowed: true,
                mode: rule.mode,
                reason: `[已记住] ${rule.reason || '您之前已允许'}`,
                needConfirm: false
              };
            case PermissionMode.DENY:
              return {
                allowed: false,
                mode: rule.mode,
                reason: `[已记住] ${rule.reason || '您之前已拒绝'}`,
                needConfirm: false
              };
            case PermissionMode.ASK:
              // ASK 规则不跳过确认
              break;
          }
        }
      }
    }
    
     // 1. 检查危险等级
    const dangerLevel = this.checkDangerLevel(toolName, input);
    if (dangerLevel === DangerLevel.DANGEROUS) {
      return {
        allowed: true,
        mode: PermissionMode.ASK,
        reason: `⚠️⚠️⚠️ 危险操作警告！${this.getDangerMessage(input)}`,
        needConfirm: true
      };
    }
    
     // 2. 匹配默认规则
    for (const rule of this.rules) {
      if (this.matchTool(rule.tool, toolName)) {
        if (rule.expiresAt && rule.expiresAt < new Date()) {
          continue;
        }
        
        switch (rule.mode) {
          case PermissionMode.ALLOW:
            return {
              allowed: true,
              mode: rule.mode,
              reason: rule.reason,
              needConfirm: false
            };
          case PermissionMode.DENY:
            return {
              allowed: false,
              mode: rule.mode,
              reason: rule.reason,
              needConfirm: false
            };
          case PermissionMode.ASK:
            return {
              allowed: true,
              mode: rule.mode,
              reason: rule.reason,
              needConfirm: true
            };
        }
      }
    }
    
    
    // 3. 检查临时规则
    for (const [_, rule] of this.tempRules) {
      if (this.matchTool(rule.tool, toolName)) {
        return {
          allowed: rule.mode !== PermissionMode.DENY,
          mode: rule.mode,
          reason: rule.reason,
          needConfirm: rule.mode === PermissionMode.ASK
        };
      }
    }
    
    // 4. 默认：需要确认
    return {
      allowed: true,
      mode: PermissionMode.ASK,
      reason: '未配置规则，请确认',
      needConfirm: true
    };
  }
  
  // 检查危险等级
  // 检查危险等级
private checkDangerLevel(toolName: string, input: any): DangerLevel | null {
  if (toolName === 'bash' && input.command) {
    const command = input.command.toLowerCase();
    
    // 先检查预定义的危险模式
    for (const { pattern, level } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return level;
      }
    }
    
    // 额外检查：删除命令（del, erase, rm）
    if (/^(del|erase|rm)\s+/.test(command)) {
      return DangerLevel.CAUTION;
    }
  }
  
  if (toolName === 'write_file' && input.file_path) {
    // 检查是否写入系统目录
    if (this.isSystemPath(input.file_path)) {
      return DangerLevel.DANGEROUS;
    }
  }
  
  return DangerLevel.SAFE;
}
  
  // 获取危险消息
  private getDangerMessage(input: any): string {
  if (input.command) {
    const command = input.command.toLowerCase();
    
    // 先检查预定义模式
    for (const { pattern, message } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return `⚠️⚠️⚠️ 危险命令: ${message} ⚠️⚠️⚠️\n   命令: "${input.command}"\n   此操作可能导致数据丢失！`;
      }
    }
    
    // 检查删除命令
    if (/^(del|erase|rm)\s+/.test(command)) {
      return `⚠️ 删除命令\n   命令: "${input.command}"\n   将删除指定文件，请确认！`;
    }
  }
  return '危险操作已阻止';
}
  
  // 匹配工具名（支持通配符）
  private matchTool(pattern: string, toolName: string): boolean {
    if (pattern === '*') return true;
    if (pattern === toolName) return true;
    if (pattern.endsWith('*') && toolName.startsWith(pattern.slice(0, -1))) return true;
    return false;
  }
  
  // 检查是否为系统路径
  private isSystemPath(filePath: string): boolean {
    const systemPaths = [
      'C:\\Windows', 'C:\\System32', 'C:\\Program Files',
      '/etc', '/usr', '/bin', '/System', '/Library'
    ];
    for (const sysPath of systemPaths) {
      if (filePath.startsWith(sysPath)) {
        return true;
      }
    }
    return false;
  }
  
  // 获取所有规则（用于调试）
  getRules(): PermissionRule[] {
    return [...this.rules];
  }
  
  // 清空临时规则
  clearTempRules(): void {
    this.tempRules.clear();
  }
}

// 全局单例
export const permissionChecker = new PermissionChecker();