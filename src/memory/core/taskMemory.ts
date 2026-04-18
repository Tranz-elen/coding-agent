import fs from 'fs/promises';
import path from 'path';
import { Task, TaskStep } from '../interfaces/types.js';
import { layeredStorage } from './storage.js';
import { logger } from '../../utils/logger.js';

export class TaskMemory {
  private tasks: Map<string, Task> = new Map();
  private tasksPath: string;
  private currentTaskId: string | null = null;

  constructor() {
    this.tasksPath = path.join(process.cwd(), 'sessions', 'memory', 'tasks.json');
    this.loadTasks();
  }

  private async loadTasks(): Promise<void> {
    try {
      const content = await fs.readFile(this.tasksPath, 'utf-8');
      const data = JSON.parse(content);
      this.tasks = new Map(Object.entries(data));
      
      // 恢复当前任务
      for (const task of this.tasks.values()) {
        if (task.status === 'active') {
          this.currentTaskId = task.id;
          break;
        }
      }
      
      logger.info(`📋 任务记忆加载完成: ${this.tasks.size} 个任务`);
    } catch {
      logger.info('📋 未找到任务记忆文件，使用空任务列表');
    }
  }

  private async saveTasks(): Promise<void> {
    const data = Object.fromEntries(this.tasks);
    await fs.mkdir(path.dirname(this.tasksPath), { recursive: true });
    await fs.writeFile(this.tasksPath, JSON.stringify(data, null, 2));
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  /**
   * 从 LLM 回复中提取步骤
   */
  extractStepsFromResponse(response: string): string[] {
    const steps: string[] = [];
    
    // 匹配数字序号：1. 2. 3. 或 1、2、3、
    const stepPattern = /(?:^|\n)\s*(?:\d+[\.、\)]|[-*•])\s*(.+?)(?=\n\s*(?:\d+[\.、\)]|[-*•]|$))/gs;
    const matches = response.matchAll(stepPattern);
    
    for (const match of matches) {
      if (match[1]) {
        steps.push(match[1].trim());
      }
    }
    
    // 如果没有匹配到，尝试按行分割
    if (steps.length === 0) {
      const lines = response.split('\n').filter(line => 
        line.trim().length > 0 && !line.startsWith('#') && !line.startsWith('```')
      );
      steps.push(...lines.slice(0, 10).map(l => l.replace(/^[-\d\.\s]+/, '').trim()));
    }
    
    return steps;
  }

  /**
   * 创建任务（带步骤和实例关联）
   */
  async createTask(
    title: string,
    goal: string,
    stepsContent: string[],
    context?: string
  ): Promise<Task> {
    const id = this.generateId();
    const steps: TaskStep[] = [];
    
    for (let i = 0; i < stepsContent.length; i++) {
      const content = stepsContent[i];
      const stepId = this.generateStepId();
      
      // 1. 查找是否已有对应实例
      let instanceId: string | undefined;
      const existingInstance = await layeredStorage.findInstanceByContent(content, 'instruction');
      
      if (existingInstance) {
        instanceId = existingInstance.id;
        logger.storage(`步骤 ${i+1} 找到已有实例: ${instanceId.slice(-16)}`);
      }
      // 注意：这里不自动创建实例，因为实例应该由 LLM 生成详细内容后再创建
      
      steps.push({
        id: stepId,
        content,
        status: 'pending',
        instanceId,
        order: i,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    
    const task: Task = {
      id,
      title,
      description: context?.substring(0, 500) || goal,
      goal,
      status: 'pending',
      steps,
      currentStepIndex: 0,
      significance: 0.5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      context,
      tags: this.extractTags(title, goal)
    };
    
    this.tasks.set(id, task);
    await this.saveTasks();
    
    logger.info(`✅ 任务已创建: ${title}，共 ${steps.length} 个步骤`);
    return task;
  }

  /**
   * 提取标签
   */
  private extractTags(title: string, goal: string): string[] {
    const text = (title + ' ' + goal).toLowerCase();
    const tags: string[] = [];
    
    const keywordMap: Record<string, string> = {
      '煮': '烹饪',
      '饭': '烹饪',
      '菜': '烹饪',
      '代码': '编程',
      '程序': '编程',
      'bug': '调试',
      '爬虫': '数据采集',
      '规划': '项目管理'
    };
    
    for (const [kw, tag] of Object.entries(keywordMap)) {
      if (text.includes(kw) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * 为步骤关联实例
   */
  async linkStepToInstance(taskId: string, stepIndex: number, instanceId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || stepIndex >= task.steps.length) return false;
    
    task.steps[stepIndex].instanceId = instanceId;
    task.steps[stepIndex].updatedAt = Date.now();
    task.updatedAt = Date.now();
    
    await this.saveTasks();
    return true;
  }

  /**
   * 为步骤生成实例（调用 LLM）
   */
  async generateInstanceForStep(
    taskId: string, 
    stepIndex: number, 
    llmGenerator: (stepContent: string) => Promise<string>
  ): Promise<string> {
    const task = this.tasks.get(taskId);
    if (!task || stepIndex >= task.steps.length) {
      throw new Error('任务或步骤不存在');
    }
    
    const step = task.steps[stepIndex];
    
    // 调用 LLM 生成详细方法
    const detailedMethod = await llmGenerator(step.content);
    
    // 创建实例
    const instanceId = await layeredStorage.createMethodInstance(
      detailedMethod,
      'instruction',
      taskId,
      step.id
    );
    
    // 关联到步骤
    step.instanceId = instanceId;
    step.updatedAt = Date.now();
    task.updatedAt = Date.now();
    
    await this.saveTasks();
    
    logger.info(`✅ 步骤 ${stepIndex+1} 实例已生成并关联`);
    return instanceId;
  }

  /**
   * 激活任务
   */
  async activateTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    // 将之前活跃的任务设为待执行
    if (this.currentTaskId) {
      const prevTask = this.tasks.get(this.currentTaskId);
      if (prevTask && prevTask.status === 'active') {
        prevTask.status = 'pending';
      }
    }
    
    task.status = 'active';
    task.updatedAt = Date.now();
    this.currentTaskId = taskId;
    
    await this.saveTasks();
    logger.info(`🎯 任务已激活: ${task.title}`);
    return true;
  }

  /**
   * 获取当前任务
   */
  getCurrentTask(): Task | null {
    if (!this.currentTaskId) return null;
    return this.tasks.get(this.currentTaskId) || null;
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(): { task: Task; step: TaskStep } | null {
    const task = this.getCurrentTask();
    if (!task) return null;
    
    const step = task.steps[task.currentStepIndex];
    if (!step) return null;
    
    return { task, step };
  }

  /**
   * 完成当前步骤，进入下一步
   */
  async completeCurrentStep(actualOutput?: string): Promise<{ task: Task; step: TaskStep; isComplete: boolean } | null> {
    const task = this.getCurrentTask();
    if (!task) return null;
    
    const step = task.steps[task.currentStepIndex];
    if (!step) return null;
    
    // 更新步骤状态
    step.status = 'completed';
    step.actualOutput = actualOutput;
    step.updatedAt = Date.now();
    
    // 进入下一步
    task.currentStepIndex++;
    task.updatedAt = Date.now();
    
    const isComplete = task.currentStepIndex >= task.steps.length;
    if (isComplete) {
      task.status = 'completed';
      task.completedAt = Date.now();
      this.currentTaskId = null;
    } else {
      task.steps[task.currentStepIndex].status = 'active';
    }
    
    await this.saveTasks();
    
    logger.info(`✅ 步骤完成: ${step.content}`);
    return { task, step, isComplete };
  }

  /**
   * 获取任务上下文（用于注入 LLM）
   */
  getTaskContext(taskId?: string): string | null {
    const task = taskId ? this.tasks.get(taskId) : this.getCurrentTask();
    if (!task) return null;
    
    const lines: string[] = [];
    lines.push(`## 任务：${task.title}`);
    lines.push(`目标：${task.goal}`);
    lines.push('');
    lines.push('### 执行步骤：');
    
    for (let i = 0; i < task.steps.length; i++) {
      const step = task.steps[i];
      const statusIcon = i < task.currentStepIndex ? '✅' : 
                         i === task.currentStepIndex ? '🔄' : '⭕';
      lines.push(`${statusIcon} ${i+1}. ${step.content}`);
      
      // 如果有实例，添加实例内容
      if (step.instanceId) {
        const instanceContent = layeredStorage.getInstanceContent(step.instanceId);
        if (instanceContent) {
          lines.push(`   📖 ${instanceContent.substring(0, 200)}`);
        }
      }
    }
    
    if (task.context) {
      lines.push('');
      lines.push('### 原始规划：');
      lines.push(task.context.substring(0, 500));
    }
    
    return lines.join('\n');
  }

  /**
   * 列出所有任务
   */
  listTasks(status?: Task['status']): Task[] {
    const tasks = Array.from(this.tasks.values());
    const filtered = status ? tasks.filter(t => t.status === status) : tasks;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      if (this.currentTaskId === taskId) {
        this.currentTaskId = null;
      }
      await this.saveTasks();
    }
    return deleted;
  }

  /**
   * 清空所有任务
   */
  async clearAll(): Promise<number> {
    const count = this.tasks.size;
    this.tasks.clear();
    this.currentTaskId = null;
    await this.saveTasks();
    return count;
  }

  /**
   * 调整任务权重
   */
  async adjustSignificance(taskId: string, delta: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.significance = Math.max(0, Math.min(1, task.significance + delta));
    task.updatedAt = Date.now();
    await this.saveTasks();
    
    logger.storage(`任务权重已调整: ${task.title} -> ${task.significance.toFixed(2)}`);
  }
}

export const taskMemory = new TaskMemory();