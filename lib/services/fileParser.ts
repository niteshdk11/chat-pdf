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

  return docs.map((doc, index) => ({
    content: doc.pageContent,
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

  const content = JSON.stringify(records, null, 2);

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
    allContent.push(`Sheet: ${sheetName}\n${JSON.stringify(data, null, 2)}`);
  });

  const content = allContent.join('\n\n');

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
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunks.push(content.slice(start, end));
    start = end - overlap;

    if (start >= content.length) break;
  }

  return chunks;
}
