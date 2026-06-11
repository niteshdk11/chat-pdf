import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile, chunkContent } from '@/lib/services/fileParser';
import { embeddingService } from '@/lib/services/embedding';
import { supabaseVectorService } from '@/lib/services/supabaseVector';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse the file
    const parsedContent = await parseFile(file);

    // Create document record
    const documentId = await supabaseVectorService.createDocument(
      user.id,
      file.name,
      file.type,
      file.size,
      file.name // Using file name as path for now
    );

    // Process chunks and embeddings
    const chunkSize = 1000;
    const overlap = 200;

    for (const parsed of parsedContent) {
      const chunks = chunkContent(parsed.content, chunkSize, overlap);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Create chunk record
        const chunkId = await supabaseVectorService.createDocumentChunk(
          documentId,
          i,
          chunk,
          {
            ...parsed.metadata,
            chunkIndex: i,
          }
        );

        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(chunk);

        // Store embedding
        await supabaseVectorService.createEmbedding(chunkId, embedding);
      }
    }

    // Update document status to completed
    await supabaseVectorService.updateDocumentStatus(documentId, 'completed');

    return NextResponse.json({
      success: true,
      documentId,
      message: 'File processed successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}
