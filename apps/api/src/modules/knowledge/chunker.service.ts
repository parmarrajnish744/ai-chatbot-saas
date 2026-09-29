export interface TextChunk {
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
}

export class TextChunkerService {
  private readonly DEFAULT_CHUNK_SIZE_CHARS = 1800; // ~450-500 tokens
  private readonly DEFAULT_OVERLAP_CHARS = 200;    // ~50 tokens

  /**
   * Recursively splits document text into semantic chunks with overlap.
   */
  chunkText(
    text: string,
    maxChunkSize: number = this.DEFAULT_CHUNK_SIZE_CHARS,
    overlap: number = this.DEFAULT_OVERLAP_CHARS
  ): TextChunk[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return [];

    const chunks: TextChunk[] = [];
    const paragraphs = cleanText.split(/\n\n+/);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length <= maxChunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
      } else {
        // If single paragraph is larger than maxChunkSize, split by sentences
        if (para.length > maxChunkSize) {
          const sentences = para.split(/(?<=[.?!])\s+/);
          for (const sentence of sentences) {
            if ((currentChunk + ' ' + sentence).length <= maxChunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            } else {
              if (currentChunk) {
                chunks.push({
                  chunkIndex: chunkIndex++,
                  content: currentChunk.trim(),
                  tokenEstimate: Math.ceil(currentChunk.length / 4),
                });
                // Carry forward overlap from the tail of current chunk
                const overlapText = currentChunk.slice(-overlap);
                currentChunk = `${overlapText} ${sentence}`;
              } else {
                currentChunk = sentence;
              }
            }
          }
        } else {
          // Push current chunk
          if (currentChunk) {
            chunks.push({
              chunkIndex: chunkIndex++,
              content: currentChunk.trim(),
              tokenEstimate: Math.ceil(currentChunk.length / 4),
            });
            const overlapText = currentChunk.slice(-overlap);
            currentChunk = `${overlapText}\n\n${para}`;
          } else {
            currentChunk = para;
          }
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        content: currentChunk.trim(),
        tokenEstimate: Math.ceil(currentChunk.length / 4),
      });
    }

    return chunks;
  }
}

export const textChunkerService = new TextChunkerService();
