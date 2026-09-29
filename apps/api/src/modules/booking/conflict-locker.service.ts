import crypto from 'crypto';
import { redisClient } from '../../queues/redis';

export class SlotConflictLocker {
  private inMemorySlotLocks = new Map<string, number>();
  private readonly DEFAULT_LOCK_TTL_MS = 60000; // 60 seconds reservation hold

  /**
   * Attempts to acquire an exclusive lock on a specific calendar time slot.
   */
  async acquireSlotLock(tenantId: string, startTime: string): Promise<string | null> {
    const lockKey = `lock:slot:${tenantId}:${startTime}`;
    const token = crypto.randomUUID();

    if (redisClient.status === 'ready') {
      try {
        const result = await redisClient.set(lockKey, token, 'PX', this.DEFAULT_LOCK_TTL_MS, 'NX');
        if (result === 'OK') return token;
        return null;
      } catch (err) {}
    }

    // In-memory fallback
    const now = Date.now();
    const existing = this.inMemorySlotLocks.get(lockKey);
    if (existing && existing > now) {
      return null; // Slot already locked by another buyer
    }

    this.inMemorySlotLocks.set(lockKey, now + this.DEFAULT_LOCK_TTL_MS);
    return token;
  }

  /**
   * Releases the slot reservation lock.
   */
  async releaseSlotLock(tenantId: string, startTime: string, token: string): Promise<boolean> {
    const lockKey = `lock:slot:${tenantId}:${startTime}`;

    if (redisClient.status === 'ready') {
      try {
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const res = await redisClient.eval(luaScript, 1, lockKey, token);
        return res === 1;
      } catch (err) {}
    }

    this.inMemorySlotLocks.delete(lockKey);
    return true;
  }
}

export const slotConflictLocker = new SlotConflictLocker();
