import { redisClient } from './redis';

export class MessageDeduplicationService {
  private fallbackMemoryStore = new Map<string, number>();
  private readonly TTL_SECONDS = 300; // 5 minutes

  /**
   * Checks if an inbound message has already been received.
   * Returns true if it is a NEW message (idempotency key acquired).
   * Returns false if it is a DUPLICATE message.
   */
  async checkAndAcquire(channelMessageId: string): Promise<boolean> {
    const key = `idempotency:msg:${channelMessageId}`;

    if (redisClient.status === 'ready') {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 200));
        const setPromise = redisClient.set(key, '1', 'EX', this.TTL_SECONDS, 'NX');
        const result = await Promise.race([setPromise, timeoutPromise]);
        if (result !== null) {
          return result === 'OK';
        }
      } catch (err) {
        // Fallback to in-memory store
      }
    }
      // In-memory fallback if Redis is unavailable
      const now = Date.now();
      const existingExpiry = this.fallbackMemoryStore.get(key);

      if (existingExpiry && existingExpiry > now) {
        return false; // Duplicate
      }

      this.fallbackMemoryStore.set(key, now + this.TTL_SECONDS * 1000);
      
      // Cleanup expired keys periodically if memory store grows
      if (this.fallbackMemoryStore.size > 5000) {
        for (const [k, exp] of this.fallbackMemoryStore.entries()) {
          if (exp <= now) this.fallbackMemoryStore.delete(k);
        }
      }

      return true; // Fresh message
  }
}

export const messageDedupService = new MessageDeduplicationService();
