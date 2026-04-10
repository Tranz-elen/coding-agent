import fs from 'fs';
import path from 'path';

export interface AgentConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  maxIterations: number;
  verbose: boolean;
  maxOutputSize: {
    read_file: number;
    bash: number;
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  compress: {
    maxTokens: number;
    keepRecent: number;
  };
}

const DEFAULT_CONFIG: AgentConfig = {
  model: 'deepseek-chat',
  maxTokens: 4096,
  temperature: 0.7,
  maxIterations: 50,
  verbose: true,
  maxOutputSize: {
    read_file: 5000,
    bash: 10000
  },
  rateLimit: {
    maxRequests: 30,
    windowMs: 60000
  },
  compress: {
    maxTokens: 50000,
    keepRecent: 8
  }
};

export function loadConfig(): AgentConfig {
  const configPath = path.join(process.cwd(), '.codeagentrc.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('📝 未找到配置文件，使用默认配置');
    return DEFAULT_CONFIG;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (error) {
    console.error('⚠️ 配置文件解析失败，使用默认配置:', error);
    return DEFAULT_CONFIG;
  }
}