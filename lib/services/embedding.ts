import { OpenAIEmbeddings } from '@langchain/openai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENROUTER_API_KEY,
      modelName: OPENROUTER_EMBEDDING_MODEL,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
      },
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await this.embeddings.embedDocuments(texts);
    return embeddings;
  }
}

export const embeddingService = new EmbeddingService();
