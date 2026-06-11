import { createClient } from '@/lib/supabase/server';

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, any>;
}

export interface DocumentEmbedding {
  id: string;
  chunk_id: string;
  embedding: number[];
}

export class SupabaseVectorService {
  private supabase: any;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  async createDocument(userId: string, fileName: string, fileType: string, fileSize: number, filePath: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        file_path: filePath,
        status: 'processing',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateDocumentStatus(documentId: string, status: 'completed' | 'failed'): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', documentId);

    if (error) throw error;
  }

  async createDocumentChunk(documentId: string, chunkIndex: number, content: string, metadata: Record<string, any>): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('document_chunks')
      .insert({
        document_id: documentId,
        chunk_index: chunkIndex,
        content,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async createEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('document_embeddings')
      .insert({
        chunk_id: chunkId,
        embedding: `[${embedding.join(',')}]`,
      });

    if (error) throw error;
  }

  async similaritySearch(queryEmbedding: number[], userId: string, limit: number = 5): Promise<DocumentChunk[]> {
    const supabase = await this.getClient();
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    const { data, error } = await supabase
      .rpc('match_documents', {
        query_embedding: embeddingString,
        match_threshold: 0.5,
        match_count: limit,
        user_id: userId,
      });

    if (error) throw error;
    return data;
  }

  async saveChatHistory(userId: string, documentId: string | null, role: 'user' | 'assistant', content: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        document_id: documentId,
        role,
        content,
      });

    if (error) throw error;
  }

  async getChatHistory(userId: string, documentId?: string): Promise<any[]> {
    const supabase = await this.getClient();
    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getUserDocuments(userId: string): Promise<any[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
}

export const supabaseVectorService = new SupabaseVectorService();
