/**
 * 分层记忆存储模块
 * 实例层 → 特征层 → 符号层
 */
import fs from 'fs/promises';
import path from 'path';
import { MemoryFragment, MemoryQuery, MemoryType } from '../interfaces/types.js';
import { feedbackProcessor } from './feedback.js';
import { embeddingService } from '../utils/embedding.js';
import { logger } from '../../utils/logger.js';

export class LayeredStorage {
  private instances: Map<string, MemoryFragment> = new Map();
  private features: Map<string, MemoryFragment> = new Map();
  private symbols: Map<string, MemoryFragment> = new Map();
  
  private baseDir: string;
  private instancesDir: string;
  private featuresDir: string;
  private symbolsDir: string;
  private indexesDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'sessions', 'memory');
    this.instancesDir = path.join(this.baseDir, 'instances');
    this.featuresDir = path.join(this.baseDir, 'features');
    this.symbolsDir = path.join(this.baseDir, 'symbols');
    this.indexesDir = path.join(this.baseDir, 'indexes');
    
    this.ensureDirectories();
    this.loadFromDisk();
  }
  
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.instancesDir, { recursive: true });
      await fs.mkdir(this.featuresDir, { recursive: true });
      await fs.mkdir(this.symbolsDir, { recursive: true });
      await fs.mkdir(this.indexesDir, { recursive: true });
      logger.storage('记忆目录已创建:', this.baseDir);
    } catch (error) {
      logger.error('创建记忆目录失败:', error);
    }
  }

  async store(data: any, significance: number): Promise<string> {
    logger.storage('store 入口, 显著性:', significance);
    
    const existingId = await this.findDuplicate(data);
    if (existingId) {
      logger.storage('发现重复内容，跳过存储，返回已有 ID:', existingId);
      return existingId;
    }

    let id = '';
    let type: MemoryType;
    let filePath = '';
    
    if (significance > 0.2) {
      id = await this.storeInstance(data, significance);
      type = 'instance';
      filePath = path.join(this.instancesDir, `${id}.json`);
    } else if (significance > 0.05) {
      id = await this.storeFeatures(data, significance);
      type = 'feature';
      filePath = path.join(this.featuresDir, `${id}.json`);
    } else {
      id = await this.storeSymbols(data, significance);
      type = 'symbol';
      filePath = path.join(this.symbolsDir, `${id}.json`);
    }
    
    await this.saveFragmentToDisk(id, filePath);
    
    try {
      await this.buildLinks(id, type, data);
    } catch (error) {
      logger.error('建立关联失败:', error);
    }

    const isUserInput = data?.type === 'user_input' || 
                        (typeof data === 'string' && !data.includes('"type":"agent_response"'));
    logger.correction('store 判断:', { 
      isUserInput, 
      dataType: data?.type, 
      dataString: typeof data === 'string' ? data.substring(0, 50) : 'not string' 
    });
    if (isUserInput) {
      const contentStr = typeof data === 'string' ? data : JSON.stringify(data);
      await this.handleCorrection(id, contentStr);
    }
    
    logger.storage('已保存到磁盘, ID:', id, '路径:', filePath);
    
    this.generateEmbedding(id, data).catch(err => {
      logger.error('生成向量失败:', err);
    });
    
    return id;
  }

  private async generateEmbedding(id: string, data: any): Promise<void> {
    if (!embeddingService.isReady()) {
      await embeddingService.initialize();
    }
    
    const text = this.extractText(data);
    if (!text || text.length < 5) return;
    
    const embedding = await embeddingService.embed(text);
    
    const fragment = this.getFragmentById(id);
    if (fragment) {
      fragment.embedding = embedding;
      await this.saveFragmentToDisk(id, this.getFilePath(fragment.type, id));
    }
  }

  private extractText(data: any): string {
    if (typeof data === 'string') return data;
    if (data?.content) return data.content;
    if (data?.type === 'user_input') return data.content;
    return JSON.stringify(data);
  }

  private async findDuplicate(data: any): Promise<string | null> {
    const coreContent = this.extractCoreContent(data);
    const coreStr = JSON.stringify(coreContent).toLowerCase();
    
    for (const map of [this.instances, this.features, this.symbols]) {
      for (const [id, frag] of map) {
        const fragCore = this.extractCoreContent(frag.content);
        const fragStr = JSON.stringify(fragCore).toLowerCase();
        
        if (fragStr === coreStr) {
          return id;
        }
        
        if (this.calculateTextSimilarity(fragStr, coreStr) > 0.95) {
          return id;
        }
      }
    }
    return null;
  }

  private extractCoreContent(data: any): any {
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      return {
        type: data.type,
        content: data.content
      };
    }
    return data;
  }

  private async saveFragmentToDisk(id: string, filePath: string): Promise<void> {
    const fragment = this.instances.get(id) || this.features.get(id) || this.symbols.get(id);
    if (fragment) {
      await fs.writeFile(filePath, JSON.stringify(fragment, null, 2));
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      await this.loadDirectory(this.instancesDir, this.instances);
      await this.loadDirectory(this.featuresDir, this.features);
      await this.loadDirectory(this.symbolsDir, this.symbols);
      
      logger.storage('从磁盘加载记忆完成:', {
        instances: this.instances.size,
        features: this.features.size,
        symbols: this.symbols.size
      });
    } catch (error) {
      logger.error('加载记忆失败，使用空存储:', error);
    }
  }

  private async loadDirectory(dir: string, targetMap: Map<string, MemoryFragment>): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const fragment: MemoryFragment = JSON.parse(content);
          targetMap.set(fragment.id, fragment);
        }
      }
    } catch {
      // 目录可能不存在，忽略
    }
  }
  
  async storeInstance(data: any, significance: number): Promise<string> {
    const id = this.generateId();
    const fragment: MemoryFragment = {
      id,
      content: data,
      significance,
      timestamp: Date.now(),
      type: 'instance',
      links: []
    };
    this.instances.set(id, fragment);
    return id;
  }
  
  async storeFeatures(data: any, significance: number): Promise<string> {
    const id = this.generateId();
    const features = this.extractFeatures(data);
    const fragment: MemoryFragment = {
      id,
      content: features,
      significance,
      timestamp: Date.now(),
      type: 'feature',
      links: []
    };
    this.features.set(id, fragment);
    return id;
  }
  
  async storeSymbols(data: any, significance: number): Promise<string> {
    const id = this.generateId();
    const fragment: MemoryFragment = {
      id,
      content: data,
      significance,
      timestamp: Date.now(),
      type: 'symbol',
      links: []
    };
    this.symbols.set(id, fragment);
    return id;
  }
  
  async retrieve(query: MemoryQuery): Promise<MemoryFragment[]> {
    logger.retrieve('各层大小:', {
      instances: this.instances.size,
      features: this.features.size,
      symbols: this.symbols.size
    });
    
    const results: Array<{ fragment: MemoryFragment; score: number }> = [];
    const targetMap = this.getMapByType(query.type);
    
    const queryStr = typeof query.query === 'string' 
      ? query.query.toLowerCase() 
      : JSON.stringify(query.query || '').toLowerCase();
    
    const queryKeywords = this.extractKeywords(queryStr);
    
    const nameKeywords = ['名字', '称呼', '叫什么', '是谁', '哪位', 'name', '称呼我'];
    const isNameQuestion = nameKeywords.some(kw => queryStr.includes(kw.toLowerCase()));
    
    let queryEmbedding: number[] | null = null;
    if (query.query && embeddingService.isReady()) {
      try {
        const queryText = typeof query.query === 'string' 
          ? query.query 
          : JSON.stringify(query.query);
        queryEmbedding = await embeddingService.embed(queryText);
      } catch (error) {
        logger.error('查询向量化失败:', error);
      }
    }
    
    for (const fragment of targetMap.values()) {
      if (fragment.status === 'deprecated') {
        continue;
      }
      if (fragment.significance < (query.minSignificance || 0)) {
        continue;
      }

      const contentStr = JSON.stringify(fragment.content).toLowerCase();
      
      if (this.isPureQuestion(contentStr)) {
        continue;
      }
      
      let score = 0;
      
      if (contentStr.includes(queryStr)) {
        score += 5;
      }
      
      for (const kw of queryKeywords) {
        if (contentStr.includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      
      if (queryEmbedding && fragment.embedding) {
        const semanticScore = embeddingService.cosineSimilarity(queryEmbedding, fragment.embedding);
        score += semanticScore * 10;
      }
      
      const avoidCheck = feedbackProcessor.matchAvoidZone(contentStr);
      if (avoidCheck.matched) {
        score = score * (1 - avoidCheck.intensity!);
        logger.feedback('避雷区命中，降权:', { content: contentStr.substring(0, 30), newScore: score });
      }
      
      if (isNameQuestion) {
        if (contentStr.includes('我叫') || contentStr.includes('我是') || 
            contentStr.includes('我的名字') || contentStr.includes('称呼我')) {
          score += 20;
        }
      }
      
      const isPureQuestionContent = contentStr.includes('?') || contentStr.includes('？') || 
                                     contentStr.includes('什么') || contentStr.includes('谁') ||
                                     contentStr.includes('哪') || contentStr.includes('怎么');
      if (isPureQuestionContent && !contentStr.includes('我叫') && !contentStr.includes('我是')) {
        score = Math.floor(score / 3);
      }

      if (score > 0 || !query.query) {
        results.push({ fragment, score });
      }
    }
    
    const merged = new Map<string, { fragment: MemoryFragment; score: number }>();
    for (const item of results) {
      const core = this.extractCoreContent(item.fragment.content);
      const key = JSON.stringify(core).toLowerCase();
      const existing = merged.get(key);
      if (!existing || item.score > existing.score) {
        merged.set(key, item);
      }
    }
    
    const uniqueResults = Array.from(merged.values());
    uniqueResults.sort((a, b) => b.score - a.score);
    
    logger.retrieve('候选记忆得分:', 
      uniqueResults.map(r => ({ 
        score: r.score, 
        content: JSON.stringify(r.fragment.content).substring(0, 40) 
      }))
    );
    logger.retrieve(`去重后结果: ${uniqueResults.length} 条, 最高分: ${uniqueResults[0]?.score || 0}`);
    
    return uniqueResults.slice(0, query.limit || 10).map(r => r.fragment);
  }
  
  private getMapByType(type?: MemoryType): Map<string, MemoryFragment> {
    if (type === 'instance') return this.instances;
    if (type === 'feature') return this.features;
    if (type === 'symbol') return this.symbols;
    
    const all = new Map<string, MemoryFragment>();
    for (const m of [this.instances, this.features, this.symbols]) {
      for (const [k, v] of m) {
        all.set(k, v);
      }
    }
    return all;
  }

  private isPureQuestion(content: string): boolean {
    if (content.includes('?') || content.includes('？')) return true;
    
    const questionStarters = ['什么', '谁', '哪', '怎么', '为什么', '如何', 'what', 'who', 'which', 'how', 'why'];
    const trimmed = content.trim().toLowerCase();
    if (questionStarters.some(q => trimmed.startsWith(q))) return true;
    
    const questionPatterns = [
      /我叫什么/, /你叫什么/, /怎么称呼/, /你是谁/,
      /.*什么.*/, /.*谁.*/, /.*哪.*/, /.*怎么.*/, /.*为什么.*/,
      /.*如何.*/, /.*吗[？?]?$/, /.*呢[？?]?$/
    ];
    if (questionPatterns.some(p => p.test(content))) return true;
    
    return false;
  }
  
  private extractFeatures(data: any): any {
    if (typeof data === 'string') {
      return {
        length: data.length,
        hasQuestion: data.includes('?'),
        hasError: data.toLowerCase().includes('error'),
        preview: data.substring(0, 100),
        keywords: this.extractKeywords(data)
      };
    }
    return {
      type: typeof data,
      keys: Object.keys(data).slice(0, 10),
      timestamp: Date.now()
    };
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那', '有', '和', '与', '或',
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as', 'from'
    ]);
    
    const words = text.split(/[\s,，。.！!？?、；;：:]+/);
    const keywords: string[] = [];
    
    for (const word of words) {
      const lower = word.toLowerCase();
      if (word.length >= 2 && !stopWords.has(lower) && !/^\d+$/.test(word)) {
        keywords.push(word);
      }
    }
    
    return [...new Set(keywords)];
  }
  
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  
  async cleanup(maxAgeDays: number = 30): Promise<number> {
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;
    
    const maps = [
      { map: this.instances, dir: this.instancesDir },
      { map: this.features, dir: this.featuresDir },
      { map: this.symbols, dir: this.symbolsDir }
    ];
    
    for (const { map, dir } of maps) {
      for (const [id, fragment] of map) {
        if (now - fragment.timestamp > maxAgeMs) {
          map.delete(id);
          try {
            await fs.unlink(path.join(dir, `${id}.json`));
          } catch {}
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }
  
  getStats(): { instances: number; features: number; symbols: number; baseDir: string } {
    return {
      instances: this.instances.size,
      features: this.features.size,
      symbols: this.symbols.size,
      baseDir: this.baseDir
    };
  }

  private async buildLinks(id: string, type: MemoryType, data: any): Promise<void> {
    const fragment = this.getFragmentById(id);
    if (!fragment) return;
    
    const contentStr = JSON.stringify(data).toLowerCase();
    const keywords = this.extractKeywords(contentStr);
    
    for (const kw of keywords) {
      const symbolId = await this.findOrCreateSymbol(kw);
      this.addLink(fragment, symbolId);
      this.addLinkToSymbol(symbolId, id);
    }
    
    if (type === 'instance') {
      const relatedFeatures = await this.findRelatedFeatures(data);
      for (const featureId of relatedFeatures) {
        this.addLink(fragment, featureId);
        this.addLinkToFeature(featureId, id);
      }
    }
    
    await this.saveFragmentToDisk(id, this.getFilePath(type, id));
  }

  private async findOrCreateSymbol(keyword: string): Promise<string> {
    for (const [id, frag] of this.symbols) {
      if (frag.content === keyword) return id;
    }
    
    const id = this.generateId();
    const fragment: MemoryFragment = {
      id,
      content: keyword,
      significance: 0.1,
      timestamp: Date.now(),
      type: 'symbol',
      links: []
    };
    this.symbols.set(id, fragment);
    
    const filePath = path.join(this.symbolsDir, `${id}.json`);
    await this.saveFragmentToDisk(id, filePath);
    
    return id;
  }

  private async findRelatedFeatures(data: any): Promise<string[]> {
    const related: string[] = [];
    const contentStr = JSON.stringify(data).toLowerCase();
    
    for (const [id, frag] of this.features) {
      const featureStr = JSON.stringify(frag.content).toLowerCase();
      if (this.calculateTextSimilarity(contentStr, featureStr) > 0.3) {
        related.push(id);
      }
    }
    
    return related.slice(0, 3);
  }

  private calculateTextSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private getFragmentById(id: string): MemoryFragment | null {
    return this.instances.get(id) || this.features.get(id) || this.symbols.get(id) || null;
  }

  private getFilePath(type: MemoryType, id: string): string {
    if (type === 'instance') return path.join(this.instancesDir, `${id}.json`);
    if (type === 'feature') return path.join(this.featuresDir, `${id}.json`);
    return path.join(this.symbolsDir, `${id}.json`);
  }

  private addLink(fragment: MemoryFragment, targetId: string): void {
    if (!fragment.links.includes(targetId)) {
      fragment.links.push(targetId);
    }
  }

  private addLinkToSymbol(symbolId: string, targetId: string): void {
    const symbol = this.symbols.get(symbolId);
    if (symbol && !symbol.links.includes(targetId)) {
      symbol.links.push(targetId);
    }
  }

  private addLinkToFeature(featureId: string, targetId: string): void {
    const feature = this.features.get(featureId);
    if (feature && !feature.links.includes(targetId)) {
      feature.links.push(targetId);
    }
  }

  private detectCorrection(content: string): { isCorrection: boolean; targetType?: string; newValue?: string } {
    logger.correction('detectCorrection 输入:', content.substring(0, 100));
    
    let text = content;
    if (content.includes('"content":"')) {
      const match = content.match(/"content":"([^"]+)"/);
      if (match) text = match[1];
    }

    const patterns = [
      /不对[，,]?\s*.*叫\s*([^\s，,"]+)/,
      /更正一下[，,]?\s*.*叫\s*(\S+)/,
      /我更正一下[，,]?\s*.*叫\s*(\S+)/,
      /实际.*叫\s*(\S+)/,
      /应该是\s*(\S+)/,
      /不是.*而是\s*(\S+)/,
      /纠正.*[：:]\s*(\S+)/,
      /改一下[，,]?\s*.*叫\s*(\S+)/,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const result = {
          isCorrection: true,
          targetType: 'name',
          newValue: match[1]
        };
        logger.correction('detectCorrection 匹配成功:', result);
        return result;
      }
    }
    
    logger.correction('detectCorrection 结果: { isCorrection: false }');
    return { isCorrection: false };
  }

  private async findContradictedMemory(newContent: string, targetType: string): Promise<MemoryFragment | null> {
    logger.correction('findContradictedMemory 开始:', { targetType });
    for (const map of [this.instances, this.features, this.symbols]) {
      for (const frag of map.values()) {
        if (frag.status === 'deprecated') continue;
        
        const fragStr = JSON.stringify(frag.content).toLowerCase();
        
        if (targetType === 'name') {
          if (fragStr.includes('我叫') || fragStr.includes('我是')) {
            logger.correction('找到可能的旧记忆:', { id: frag.id, content: fragStr.substring(0, 50) });
            return frag;
          }
        }
      }
    }
    logger.correction('未找到矛盾记忆');
    return null;
  }

  async handleCorrection(newMemoryId: string, userInput: string): Promise<void> {
    logger.correction('handleCorrection 被调用:', { newMemoryId, userInput });
    const correction = this.detectCorrection(userInput);
    logger.correction('detectCorrection 结果:', correction);
    if (!correction.isCorrection) { 
      logger.correction('未检测到更正信号'); 
      return;
    }
    
    const oldMemory = await this.findContradictedMemory(userInput, correction.targetType!);
    if (!oldMemory) return;
    
    oldMemory.status = 'deprecated';
    oldMemory.supersededBy = newMemoryId;
    await this.saveFragmentToDisk(oldMemory.id, this.getFilePath(oldMemory.type, oldMemory.id));
    
    for (const linkId of oldMemory.links) {
      const linked = this.symbols.get(linkId);
      if (linked && JSON.stringify(linked.content).includes('李明')) {
        linked.status = 'deprecated';
        linked.supersededBy = newMemoryId;
        await this.saveFragmentToDisk(linked.id, this.getFilePath('symbol', linked.id));
        logger.correction('关联符号已标记为过时:', linked.id);
      }
    }

    const newMemory = this.getFragmentById(newMemoryId);
    if (newMemory) {
      newMemory.significance = Math.min(newMemory.significance + 0.2, 1.0);
      await this.saveFragmentToDisk(newMemoryId, this.getFilePath(newMemory.type, newMemoryId));
    }
    
    logger.correction('更正处理完成:', { oldId: oldMemory.id, newId: newMemoryId });
  }

  async boostSignificance(id: string, amount: number): Promise<void> {
    const fragment = this.getFragmentById(id);
    if (!fragment) return;
    
    fragment.significance = Math.min(fragment.significance + amount, 1.0);
    await this.saveFragmentToDisk(id, this.getFilePath(fragment.type, id));
    
    logger.storage('记忆权重已提升:', { id, newSignificance: fragment.significance });
  }

  async reduceSignificance(id: string, amount: number): Promise<void> {
    const fragment = this.getFragmentById(id);
    if (!fragment) return;
    
    fragment.significance = Math.max(fragment.significance - amount, 0.01);
    await this.saveFragmentToDisk(id, this.getFilePath(fragment.type, id));
    
    logger.storage('记忆权重已降低:', { id, newSignificance: fragment.significance });
  }

/**
 * 搜索记忆（按关键词）
 */
async search(keyword: string, limit: number = 20): Promise<MemoryFragment[]> {
  const results: MemoryFragment[] = [];
  const keywordLower = keyword.toLowerCase();
  
  for (const map of [this.instances, this.features, this.symbols]) {
    for (const frag of map.values()) {
      if (frag.status === 'deprecated') continue;
      
      const contentStr = JSON.stringify(frag.content).toLowerCase();
      if (contentStr.includes(keywordLower)) {
        results.push(frag);
      }
    }
  }
  
  results.sort((a, b) => b.timestamp - a.timestamp);
  return results.slice(0, limit);
}

/**
 * 删除指定记忆
 */
async forget(id: string): Promise<boolean> {
  const fragment = this.getFragmentById(id);
  if (!fragment) return false;
  
  if (fragment.type === 'instance') {
    this.instances.delete(id);
  } else if (fragment.type === 'feature') {
    this.features.delete(id);
  } else {
    this.symbols.delete(id);
  }
  
  try {
    await fs.unlink(this.getFilePath(fragment.type, id));
    logger.storage('记忆已删除:', id);
    return true;
  } catch {
    return false;
  }
}

 
/**
 * 清空所有记忆
 */
async clearAll(): Promise<{ deleted: number }> {
  let deleted = 0;
  
  const maps = [
    { map: this.instances, dir: this.instancesDir },
    { map: this.features, dir: this.featuresDir },
    { map: this.symbols, dir: this.symbolsDir }
  ];
  
  for (const { map, dir } of maps) {
    for (const [id] of map) {
      try {
        await fs.unlink(path.join(dir, `${id}.json`));
        deleted++;
      } catch {}
    }
    map.clear();
  }
  
  logger.storage('所有记忆已清空, 共删除:', deleted, '条');
  return { deleted };
}

/**
 * 根据内容查找实例
 */
async findInstanceByContent(content: string, methodType?: string): Promise<MemoryFragment | null> {
  const contentLower = content.toLowerCase();
  
  for (const [id, frag] of this.instances) {
    if (frag.status === 'deprecated') continue;
    
    const fragContent = JSON.stringify(frag.content).toLowerCase();
    if (fragContent.includes(contentLower)) {
      return frag;
    }
  }
  return null;
}

/**
 * 创建方法实例
 */
async createMethodInstance(
  description: string, 
  methodType: string = 'instruction',
  taskId?: string,
  stepId?: string
): Promise<string> {
  const id = this.generateId();
  const fragment: MemoryFragment = {
    id,
    content: {
      type: 'method',
      methodType,
      description,
      steps: [],  // 未来可细化
      createdAt: Date.now()
    },
    significance: 0.5,  // 初始中等权重
    timestamp: Date.now(),
    type: 'instance',
    links: [],
    methodType,
    taskId,
    stepId
  };
  
  this.instances.set(id, fragment);
  await this.saveFragmentToDisk(id, this.getFilePath('instance', id));
  
  logger.storage('方法实例已创建:', { id, description: description.substring(0, 50) });
  return id;
}

/**
 * 获取实例的详细内容
 */
getInstanceContent(instanceId: string): string | null {
  const fragment = this.instances.get(instanceId);
  if (!fragment) return null;
  
  if (typeof fragment.content === 'string') return fragment.content;
  if (fragment.content?.description) return fragment.content.description;
  return JSON.stringify(fragment.content);
}

/**
 * 创建知识实例
 */
async createKnowledgeInstance(
  title: string,
  content: string,
  tags: string[] = [],
  taskId?: string,
  stepId?: string
): Promise<string> {
  const id = this.generateId();
  
  const fragment: MemoryFragment = {
    id,
    content: {
      type: 'knowledge',
      title,
      content,
      tags,
      createdAt: Date.now()
    },
    significance: 0.6,  // 知识类默认较高权重
    timestamp: Date.now(),
    type: 'instance',
    links: [],
    methodType: 'knowledge',
    taskId,
    stepId
  };
  
  this.instances.set(id, fragment);
  await this.saveFragmentToDisk(id, this.getFilePath('instance', id));
  
  // 为每个标签创建符号层关联
  for (const tag of tags) {
    const symbolId = await this.findOrCreateSymbol(tag);
    this.addLink(fragment, symbolId);
    this.addLinkToSymbol(symbolId, id);
  }
  
  logger.storage(`📚 知识实例已创建: ${title}`, { tags });
  return id;
}

}

export const layeredStorage = new LayeredStorage();