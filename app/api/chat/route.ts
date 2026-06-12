import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ragService } from '@/lib/services/rag';
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

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, documentId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use RAG service to generate response
    const response = await ragService.chat(payload.userId, message, documentId);

    return NextResponse.json({
      success: true,
      response,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
