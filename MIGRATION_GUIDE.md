# Ollie AI MVP Migration Guide

This guide outlines the steps to complete the migration from ChatPDF to Ollie AI MVP.

## Completed Changes

### Code Changes
- ✅ Updated `package.json` dependencies (removed Clerk, Qdrant, Gemini; added Supabase, OpenRouter, LangChain)
- ✅ Removed Express server and BullMQ worker backend
- ✅ Created Supabase database schema with pgvector support
- ✅ Updated environment variables configuration
- ✅ Removed Clerk authentication from frontend
- ✅ Implemented Supabase authentication in frontend
- ✅ Created file parsing service (PDF, CSV, XLSX, Markdown)
- ✅ Created embedding service with OpenRouter
- ✅ Created Supabase pgvector storage service
- ✅ Implemented RAG with LangChain and Supabase Vector Store
- ✅ Created Next.js API routes for file upload and chat
- ✅ Updated Supabase schema with match_documents function
- ✅ Updated chat UI to use new API routes and support multiple file types

### New Files Created
- `lib/supabase/client.ts` - Supabase browser client
- `lib/supabase/server.ts` - Supabase server client
- `lib/supabase/middleware.ts` - Supabase middleware for Next.js
- `components/auth/AuthButton.tsx` - Supabase authentication component
- `app/auth/callback/route.ts` - Supabase auth callback handler
- `lib/services/fileParser.ts` - File parsing service for PDF, CSV, XLSX, Markdown
- `lib/services/embedding.ts` - Embedding service using OpenRouter
- `lib/services/supabaseVector.ts` - Supabase pgvector storage service
- `lib/services/rag.ts` - RAG implementation with LangChain
- `app/api/upload/route.ts` - File upload API route
- `app/api/chat/route.ts` - Chat API route
- `supabase/schema.sql` - Supabase database schema

## Remaining Manual Steps

### 1. Install Dependencies
Navigate to the chat-pdf directory and install the new dependencies:

```bash
cd chat-pdf
npm install
```

### 2. Set Up Supabase Project
1. Create a new Supabase project at https://supabase.com
2. Enable the pgvector extension in your Supabase project:
   - Go to Database > Extensions
   - Search for "vector" and enable the "vector" extension
3. Run the schema.sql file in your Supabase SQL editor:
   - Go to Database > SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Paste and execute the SQL

### 3. Configure Environment Variables
Create a `.env.local` file in the chat-pdf directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=deepseek/deepseek-chat

# Supabase Vector Table
SUPABASE_VECTOR_TABLE=document_embeddings
```

You can get these values from your Supabase project settings:
- Project URL: Settings > API > Project URL
- Anon Key: Settings > API > anon public key
- Service Role Key: Settings > API > service_role key (keep this secret!)

For OpenRouter:
- Get your API key from https://openrouter.ai/keys
- The default model is `deepseek/deepseek-chat` but you can change it to any OpenRouter-supported model

### 4. Enable Google OAuth in Supabase (Optional)
To enable Google OAuth authentication:
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Configure your Google OAuth credentials

### 5. Run the Development Server
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, TailwindCSS
- **Authentication**: Supabase Auth (email + optional Google OAuth)
- **Database**: Supabase PostgreSQL with pgvector extension
- **AI Provider**: OpenRouter (configurable models, default: deepseek/deepseek-chat)
- **RAG Framework**: LangChain with Supabase Vector Store
- **File Support**: PDF, CSV, XLSX, Markdown

### API Routes
- `POST /api/upload` - Upload and process documents
- `POST /api/chat` - Chat with documents using RAG

### Database Schema
- `users` - User profiles
- `documents` - Document metadata
- `document_chunks` - Text chunks from documents
- `document_embeddings` - Vector embeddings with pgvector
- `chat_history` - Chat conversation history

### File Processing Pipeline
1. User uploads file (PDF, CSV, XLSX, or Markdown)
2. File is parsed based on type
3. Content is chunked (1000 characters with 200 overlap)
4. Each chunk is embedded using OpenRouter
5. Embeddings are stored in Supabase pgvector
6. Document status is updated to "completed"

### Chat Pipeline
1. User sends a message
2. Query is embedded using OpenRouter
3. Similarity search in Supabase pgvector retrieves top 5 chunks
4. Context is built from relevant chunks
5. Prompt is formatted with context and question
6. Response is generated using OpenRouter
7. Chat history is saved to Supabase

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors after installing dependencies, try:
```bash
npm run build
```

### Supabase Connection Issues
- Verify your Supabase URL and keys are correct
- Ensure pgvector extension is enabled
- Check that the schema.sql was executed successfully

### File Upload Issues
- Ensure file size is under 10MB
- Check that the file type is supported (PDF, CSV, XLSX, Markdown)
- Verify the file parsing service is working correctly

### Chat Issues
- Verify OpenRouter API key is valid
- Check that embeddings were generated for uploaded documents
- Ensure the match_documents function exists in Supabase

## Next Steps for Phase 2
- Add streaming support for chat responses
- Implement document management (list, delete, view)
- Add support for more file types
- Implement conversation history management
- Add document sharing/collaboration features
- Implement advanced RAG techniques (re-ranking, hybrid search)
