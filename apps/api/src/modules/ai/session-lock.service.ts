import crypto from 'crypto';
import { redisClient } from '../../queues/redis';

export class SessionLockService {
  private inMemoryLocks = new Map<string, { token: string; expiresAt: number }>();
  private readonly DEFAULT_LOCK_TTL_MS = 10000; // 10 seconds

  /**
   * Acquires a distributed lock for an active conversation turn.
   * Returns a unique lockToken if acquired, or null if conversation is busy.
   */
  async acquireLock(conversationId: string, ttlMs: number = this.DEFAULT_LOCK_TTL_MS): Promise<string | null> {
    const lockKey = `lock:conv:${conversationId}`;
    const token = crypto.randomUUID();

    if (redisClient.status === 'ready') {
      try {
        const result = await redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');
        if (result === 'OK') {
          return token;
        }
        return null;
      } catch (err) {
        // Fallback to in-memory lock
      }
    }

    // In-memory fallback
    const now = Date.now();
    const existing = this.inMemoryLocks.get(lockKey);

    if (existing && existing.expiresAt > now) {
      return null; // Busy
    }

    this.inMemoryLocks.set(lockKey, { token, expiresAt: now + ttlMs });
    return token;
  }

  /**
   * Releases the conversation lock only if the token matches the lock owner.
   */
  async releaseLock(conversationId: string, token: string): Promise<boolean> {
    const lockKey = `lock:conv:${conversationId}`;

    if (redisClient.status === 'ready') {
      try {
        // Lua script ensures atomic check and delete
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await redisClient.eval(luaScript, 1, lockKey, token);
        return result === 1;
      } catch (err) {
        // Fallback
      }
    }

    const current = this.inMemoryLocks.get(lockKey);
    if (current && current.token === token) {
      this.inMemoryLocks.delete(lockKey);
      return true;
    }
    return false;
  }
}

export const sessionLockService = new SessionLockService();
