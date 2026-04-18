import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// 配置离线模式
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = 'C:\\Users\\18926\\.cache\\huggingface\\hub';


class EmbeddingService {
  private extractor: FeatureExtractionPipeline | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[Embedding] 正在加载模型...');
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        this.initialized = true;
        console.log('[Embedding] 模型加载完成');
      } catch (error) {
        console.error('[Embedding] 模型加载失败:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  async embed(text: string): Promise<number[]> {
    await this.initialize();
    
    if (!this.extractor) {
      throw new Error('Embedding service not initialized');
    }

    const result = await this.extractor(text, { pooling: 'mean' });
    return Array.from(result.data);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initialize();
    
    if (!this.extractor) {
      throw new Error('Embedding service not initialized');
    }

    const embeddings: number[][] = [];
    for (const text of texts) {
      const emb = await this.embed(text);
      embeddings.push(emb);
    }
    return embeddings;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dot = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
  }

  isReady(): boolean {
    return this.initialized;
  }
}

export const embeddingService = new EmbeddingService();