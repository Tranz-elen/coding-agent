// 确保使用 export 导出
export interface ToolInput {
  // 所有工具输入的基类
}

export interface ToolOutput {
  success: boolean;
  message: string;
  data?: any;
}

export abstract class BaseTool<TInput extends ToolInput> {
  abstract name: string;
  abstract description: string;
  abstract schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  
  abstract execute(input: TInput): Promise<ToolOutput>;
  
  async checkPermissions(input: TInput): Promise<boolean> {
    return true;
  }
  
  isReadOnly(): boolean {
    return false;
  }
  
  isConcurrencySafe(): boolean {
    return true;
  }
}