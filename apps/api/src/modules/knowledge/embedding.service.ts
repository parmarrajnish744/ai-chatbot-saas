export class EmbeddingService {
  private apiKey = process.env.OPENAI_API_KEY;
  private model = 'text-embedding-3-small';
  private dimension = 1536;

  /**
   * Generates a 1536-dimensional embedding vector for the given text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Return mock deterministic embedding if in test mode or no API key configured
    if (process.env.NODE_ENV === 'test' || !this.apiKey || this.apiKey.startsWith('sk-proj-your')) {
      return this.generateMockEmbedding(text);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text.slice(0, 8000), // Max input slice
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embedding API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.data[0].embedding;
    } catch (err) {
      console.warn('Embedding API unavailable, falling back to local deterministic embedding:', err);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Generates a deterministic unit-length 1536-float vector for testing/offline dev.
   */
  private generateMockEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    for (let j = 0; j < this.dimension; j++) {
      vector[j] = Math.sin((hash + j) * 0.1);
    }

    // Normalize vector to unit length
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((val) => (norm > 0 ? val / norm : 0));
  }
}

export const embeddingService = new EmbeddingService();
