import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile, chunkContent } from '@/lib/services/fileParser';
import { embeddingService } from '@/lib/services/embedding';
import { supabaseVectorService } from '@/lib/services/supabaseVector';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    let token = request.cookies.get('auth-token')?.value;

    // If no token in cookie, try to get from Authorization header (for localStorage fallback)
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    console.log('Upload route - Token present:', !!token);
    console.log('Upload route - All cookies:', request.cookies.getAll());

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token found' }, { status: 401 });
    }

    const payload = verifyToken(token);

    console.log('Upload route - Token payload:', payload);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const supabase = await createClient();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse the file
    const parsedContent = await parseFile(file);
    console.log('Parsed content:', parsedContent.length, 'items');

    // Create document record
    const documentId = await supabaseVectorService.createDocument(
      payload.userId,
      file.name,
      file.type,
      file.size,
      file.name // Using file name as path for now
    );

    // Process chunks and embeddings
    const chunkSize = 500;
    const overlap = 0; // Disable overlap for now

    for (const parsed of parsedContent) {
      console.log('Processing parsed item, content length:', parsed.content.length);
      console.log('Content type:', typeof parsed.content);

      const chunks = chunkContent(parsed.content, chunkSize, overlap);
      console.log('Generated chunks:', chunks.length);

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
