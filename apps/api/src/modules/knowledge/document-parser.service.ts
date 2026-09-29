export interface ParsedDocument {
  title: string;
  textContent: string;
  sourceType: 'txt' | 'markdown' | 'pdf' | 'docx' | 'csv' | 'web';
  metadata: Record<string, any>;
}

export class DocumentParserService {
  /**
   * Parses raw file buffers based on mimetype and filename.
   */
  async parseBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<ParsedDocument> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    let textContent = '';
    let sourceType: ParsedDocument['sourceType'] = 'txt';

    if (ext === 'md' || mimeType.includes('markdown')) {
      sourceType = 'markdown';
      textContent = buffer.toString('utf-8');
    } else if (ext === 'csv' || mimeType.includes('csv')) {
      sourceType = 'csv';
      textContent = buffer.toString('utf-8');
    } else if (ext === 'txt' || mimeType.includes('text/plain')) {
      sourceType = 'txt';
      textContent = buffer.toString('utf-8');
    } else if (ext === 'pdf' || mimeType.includes('pdf')) {
      sourceType = 'pdf';
      // In production, pdf-parse extracts text. Fallback to buffer text if raw or simulated
      textContent = buffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    } else {
      textContent = buffer.toString('utf-8');
    }

    return {
      title: filename,
      textContent: textContent.trim(),
      sourceType,
      metadata: {
        filename,
        mimeType,
        sizeBytes: buffer.length,
        parsedAt: new Date().toISOString(),
      },
    };
  }
}

export const documentParserService = new DocumentParserService();
