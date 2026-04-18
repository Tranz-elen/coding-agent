import { loadConfig } from './config.js';

const config = loadConfig();

export const logger = {
  memory: (...args: any[]) => {
    if (config.debug?.memory) console.log('[MEMORY]', ...args);
  },
  storage: (...args: any[]) => {
    if (config.debug?.storage) console.log('[STORAGE]', ...args);
  },
  retrieve: (...args: any[]) => {
    if (config.debug?.retrieve) console.log('[RETRIEVE]', ...args);
  },
  embedding: (...args: any[]) => {
    if (config.debug?.embedding) console.log('[EMBEDDING]', ...args);
  },
  feedback: (...args: any[]) => {
    if (config.debug?.feedback) console.log('[FEEDBACK]', ...args);
  },
  correction: (...args: any[]) => {
    if (config.debug?.correction) console.log('[CORRECTION]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);  // 错误始终输出
  },
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);  // 重要信息始终输出
  }
};