import { BaseTool, ToolInput, ToolOutput } from './base.js';
import readline from 'readline';

interface Question {
  question: string;
  options?: string[];
  default?: string;
}

interface AskUserInput extends ToolInput {
  questions: Question[];
  timeout?: number;
}

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
  
  // 设置主 readline（从 AgentLoop 传入）
  private mainRl: readline.Interface | null = null;
  
  setReadline(rl: readline.Interface): void {
    this.mainRl = rl;
  }
  
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
        reject(new Error(`问题 "${question.question}" 超时未回答`));
      }, timeout);
      
      const ask = (rl: readline.Interface) => {
        rl.question(promptText, (answer) => {
          clearTimeout(timer);
          
          let finalAnswer = answer.trim();
          
          if (!finalAnswer && !question.default) {
            console.log('⚠️ 请输入答案：');
            ask(rl);
            return;
          }
          
          if (!finalAnswer && question.default) {
            finalAnswer = question.default;
            console.log(`   使用默认值: ${finalAnswer}`);
          }
          
          if (question.options && question.options.length > 0) {
            if (!question.options.includes(finalAnswer)) {
              console.log(`⚠️ 答案必须是以下选项之一: ${question.options.join(', ')}`);
              ask(rl);
              return;
            }
          }
          
          resolve(finalAnswer);
        });
      };
      
      if (this.mainRl) {
        ask(this.mainRl);
      } else {
        const tempRl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        ask(tempRl);
      }
    });
  }
  
  isReadOnly(): boolean {
    return true;
  }
}