import { BaseTool } from './base.js';
import { BashTool } from './bash.js';
import { FileReadTool } from './read.js';
import { FileWriteTool } from './write.js';
import { GlobTool } from './glob.js';
import { GrepTool } from './grep.js';
import { TodoWriteTool } from './TodoWriteTool.js';
import { FileEditTool } from './FileEditTool.js';
import { AskUserQuestionTool } from './AskUserQuestionTool.js';
import { WebFetchTool } from './WebFetchTool.js';
import { WebSearchTool } from './WebSearchTool.js';

export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, BaseTool<any>> = new Map();
  
  private constructor() {
    this.register(new BashTool());
    this.register(new FileReadTool());
    this.register(new FileWriteTool());
    this.register(new GlobTool());
    this.register(new GrepTool());
    this.register(new TodoWriteTool()); 
    this.register(new FileEditTool()); 
    this.register(new AskUserQuestionTool()); 
    this.register(new WebFetchTool()); 
    this.register(new WebSearchTool());
  }
  
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  
  register(tool: BaseTool<any>): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): BaseTool<any> | undefined {
    return this.tools.get(name);
  }
  
  getAll(): BaseTool<any>[] {
    return Array.from(this.tools.values());
  }
  
  getLLMToolDefinitions(): any[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.schema
    }));
  }
}