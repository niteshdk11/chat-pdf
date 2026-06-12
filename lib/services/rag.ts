import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { embeddingService } from './embedding';
import { supabaseVectorService } from './supabaseVector';
import { SYSTEM_PROMPT } from '@/lib/config/systemPrompt';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

export class RAGService {
  private llm: ChatOpenAI;

  constructor() {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: OPENROUTER_API_KEY,
      modelName: OPENROUTER_MODEL,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
      },
      temperature: 0.7,
      maxTokens: 1000, // Limit tokens to avoid credit issues
    });
  }

  async chat(userId: string, query: string, documentId?: string): Promise<string> {
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Search for relevant chunks
    const relevantChunks = await supabaseVectorService.similaritySearch(
      queryEmbedding,
      userId,
      documentId,
      5
    );

    if (relevantChunks.length === 0) {
      return "I couldn't find any relevant information in your documents. Please upload some documents first.";
    }

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk) => chunk.content)
      .join('\n\n---\n\n');

    // Create prompt with current date/time
    const currentDateTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const promptWithTime = SYSTEM_PROMPT.replace('{current_date_time}', currentDateTime);

    const prompt = PromptTemplate.fromTemplate(`
Context:
{context}

Question:
{question}

Answer:
`);

    // Format the prompt
    const formattedPrompt = await prompt.format({
      context,
      question: query,
    });

    // Prepend system prompt with date/time
    const finalPrompt = `${promptWithTime}\n\n${formattedPrompt}`;

    // Generate response
    const response = await this.llm.invoke(finalPrompt);
    const answer = response.content as string;

    // Save chat history
    await supabaseVectorService.saveChatHistory(userId, documentId || null, 'user', query);
    await supabaseVectorService.saveChatHistory(userId, documentId || null, 'assistant', answer);

    return answer;
  }

  async chatWithStreaming(userId: string, query: string, documentId?: string): Promise<AsyncIterable<string>> {
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Search for relevant chunks
    const relevantChunks = await supabaseVectorService.similaritySearch(
      queryEmbedding,
      userId,
      documentId,
      5
    );

    if (relevantChunks.length === 0) {
      return (async function* () {
        yield "I couldn't find any relevant information in your documents. Please upload some documents first.";
      })();
    }

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk) => chunk.content)
      .join('\n\n---\n\n');

    // Create prompt with current date/time
    const currentDateTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const promptWithTime = SYSTEM_PROMPT.replace('{current_date_time}', currentDateTime);

    const prompt = PromptTemplate.fromTemplate(`
Context:
{context}

Question:
{question}

Answer:
`);

    // Format the prompt
    const formattedPrompt = await prompt.format({
      context,
      question: query,
    });

    // Prepend system prompt with date/time
    const finalPrompt = `${promptWithTime}\n\n${formattedPrompt}`;

    // Generate streaming response
    const stream = await this.llm.stream(finalPrompt);

    let fullAnswer = '';

    return (async function* () {
      for await (const chunk of stream) {
        const content = chunk.content as string;
        fullAnswer += content;
        yield content;
      }

      // Save chat history after streaming completes
      await supabaseVectorService.saveChatHistory(userId, documentId || null, 'user', query);
      await supabaseVectorService.saveChatHistory(userId, documentId || null, 'assistant', fullAnswer);
    })();
  }
}

export const ragService = new RAGService();
