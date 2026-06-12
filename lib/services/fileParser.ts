import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { marked } from 'marked';

export interface ParsedContent {
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    chunkIndex: number;
  };
}

export async function parsePDF(file: File): Promise<ParsedContent[]> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const loader = new PDFLoader(buffer);
  const docs = await loader.load();

  // Limit number of pages to prevent memory issues
  const maxPages = 50;
  const limitedDocs = docs.slice(0, maxPages);

  console.log('PDF parsed:', docs.length, 'pages, limited to:', limitedDocs.length);

  return limitedDocs.map((doc, index) => ({
    content: doc.pageContent || '',
    metadata: {
      fileName: file.name,
      fileType: 'pdf',
      chunkIndex: index,
    },
  }));
}

export async function parseCSV(file: File): Promise<ParsedContent[]> {
  const text = await file.text();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
  });

  // Limit the number of records to prevent memory issues
  const maxRecords = 1000;
  const limitedRecords = records.slice(0, maxRecords);

  const content = JSON.stringify(limitedRecords, null, 2);

  console.log('CSV parsed:', records.length, 'records, limited to:', limitedRecords.length);

  return [{
    content,
    metadata: {
      fileName: file.name,
      fileType: 'csv',
      chunkIndex: 0,
    },
  }];
}

export async function parseXLSX(file: File): Promise<ParsedContent[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const allContent: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Limit rows to prevent memory issues
    const maxRows = 1000;
    const limitedData = data.slice(0, maxRows);

    allContent.push(`Sheet: ${sheetName}\n${JSON.stringify(limitedData, null, 2)}`);
  });

  const content = allContent.join('\n\n');

  console.log('XLSX parsed, sheets:', workbook.SheetNames.length);

  return [{
    content,
    metadata: {
      fileName: file.name,
      fileType: 'xlsx',
      chunkIndex: 0,
    },
  }];
}

export async function parseMarkdown(file: File): Promise<ParsedContent[]> {
  const text = await file.text();
  const html = marked.parse(text);

  // Strip HTML tags for plain text
  const plainText = html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();

  return [{
    content: plainText,
    metadata: {
      fileName: file.name,
      fileType: 'markdown',
      chunkIndex: 0,
    },
  }];
}

export async function parseFile(file: File): Promise<ParsedContent[]> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return parsePDF(file);
  }

  if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    return parseCSV(file);
  }

  if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileName.endsWith('.xlsx')) {
    return parseXLSX(file);
  }

  if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
    return parseMarkdown(file);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export function chunkContent(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  try {
    // Validate inputs
    if (!content || typeof content !== 'string') {
      console.error('Invalid content type:', typeof content);
      return [];
    }

    if (content.length === 0) {
      console.warn('Empty content');
      return [];
    }

    // Limit content size to prevent memory issues
    const maxContentLength = 500000; // 500k characters
    if (content.length > maxContentLength) {
      console.warn('Content too large, truncating:', content.length);
      content = content.substring(0, maxContentLength);
    }

    // Use simple chunking without overlap for now to prevent issues
    const chunks: string[] = [];
    const maxChunks = 500;

    for (let i = 0; i < content.length; i += chunkSize) {
      if (chunks.length >= maxChunks) {
        console.warn('Reached max chunks limit, stopping');
        break;
      }

      const chunk = content.slice(i, i + chunkSize);
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }

    console.log('Chunked content into', chunks.length, 'chunks');
    return chunks;
  } catch (error) {
    console.error('Error in chunkContent:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return [];
  }
}
