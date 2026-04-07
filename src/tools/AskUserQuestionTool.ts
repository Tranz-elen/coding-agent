import { BaseTool, ToolInput, ToolOutput } from './base.js';
import readline from 'readline';

interface Question {
  question: string;
  options?: string[];  // 可选选项
  default?: string;    // 默认答案
}

interface AskUserInput extends ToolInput {
  questions: Question[];
  timeout?: number;  // 超时时间（毫秒）
}

// 创建独立的 readline 接口用于提问
const askRl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export class AskUserQuestionTool extends BaseTool<AskUserInput> {
  name = 'ask_user_question';
  
  description = `向用户提问并等待回答。

使用场景：
- 需要用户确认操作时
- 需要用户选择选项时
- 信息不足需要用户提供时

参数：
- questions: 问题列表（可同时问多个问题）
- 每个问题可包含选项（options）和默认答案（default）`;
  
  schema = {
    type: 'object' as const,
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string', description: '要问的问题' },
            options: { type: 'array', items: { type: 'string' }, description: '选项列表（可选）' },
            default: { type: 'string', description: '默认答案（可选）' }
          },
          required: ['question']
        },
        description: '问题列表'
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒），默认 60000（1分钟）'
      }
    },
    required: ['questions']
  };
  
  async execute(input: AskUserInput): Promise<ToolOutput> {
    const { questions, timeout = 60000 } = input;
    const answers: string[] = [];
    
    console.log('\n❓ Agent 需要向你提问：\n');
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answer = await this.askQuestion(q, i + 1, timeout);
      answers.push(answer);
    }
    
    console.log('\n✅ 已收到回答\n');
    
    return {
      success: true,
      message: `用户回答:\n${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
      data: { answers }
    };
  }
  
  private askQuestion(question: Question, index: number, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let promptText = `${index}. ${question.question}`;
      
      if (question.options && question.options.length > 0) {
        promptText += ` [${question.options.join('/')}]`;
      }
      
      if (question.default) {
        promptText += ` (默认: ${question.default})`;
      }
      
      promptText += '\n> ';
      
      const timer = setTimeout(() => {
        askRl.removeAllListeners('line');
        reject(new Error(`问题 "${question.question}" 超时未回答`));
      }, timeout);
      
      askRl.question(promptText, (answer) => {
        clearTimeout(timer);
        
        let finalAnswer = answer.trim();
        
        // 如果没输入且没有默认值，提示重新输入
        if (!finalAnswer && !question.default) {
          console.log('⚠️ 请输入答案：');
          this.askQuestion(question, index, timeout).then(resolve).catch(reject);
          return;
        }
        
        // 使用默认值
        if (!finalAnswer && question.default) {
          finalAnswer = question.default;
          console.log(`   使用默认值: ${finalAnswer}`);
        }
        
        // 验证选项
        if (question.options && question.options.length > 0) {
          if (!question.options.includes(finalAnswer)) {
            console.log(`⚠️ 答案必须是以下选项之一: ${question.options.join(', ')}`);
            this.askQuestion(question, index, timeout).then(resolve).catch(reject);
            return;
          }
        }
        
        resolve(finalAnswer);
      });
    });
  }
  
  isReadOnly(): boolean {
    return true;  // 只读操作，不修改系统
  }
}