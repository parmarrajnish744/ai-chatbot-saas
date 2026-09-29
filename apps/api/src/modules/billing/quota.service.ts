import { redisClient } from '../../queues/redis';
import { SUBSCRIPTION_PLANS } from './stripe.service';
import { prisma, withTenantContext } from '@saas/database';

export interface QuotaCheckResult {
  allowed: boolean;
  planId: string;
  currentUsage: number;
  limit: number;
  remaining: number;
  exceededBy?: number;
}

export class QuotaService {
  private inMemoryCounters: Map<string, { messages: number; tokens: number }> = new Map();

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getKey(tenantId: string, period: string, type: 'messages' | 'tokens'): string {
    return `usage:${tenantId}:${period}:${type}`;
  }

  /**
   * Atomically increments message and token counters in Redis
   */
  async incrementUsage(
    tenantId: string,
    messagesCount = 1,
    tokensCount = 0
  ): Promise<{ currentMessages: number; currentTokens: number }> {
    const period = this.getCurrentPeriod();
    const msgKey = this.getKey(tenantId, period, 'messages');
    const tokenKey = this.getKey(tenantId, period, 'tokens');

    let currentMessages = 0;
    let currentTokens = 0;

    try {
      if (redisClient && redisClient.status === 'ready') {
        const pipeline = redisClient.pipeline();
        pipeline.incrby(msgKey, messagesCount);
        if (tokensCount > 0) {
          pipeline.incrby(tokenKey, tokensCount);
        }
        // Set TTL to 60 days
        pipeline.expire(msgKey, 60 * 86400);
        pipeline.expire(tokenKey, 60 * 86400);

        const results = await Promise.race([
          pipeline.exec(),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 200))
        ]);

        if (results && results[0] && results[0][1] !== undefined) {
          currentMessages = Number(results[0][1]);
          currentTokens = results[1] && results[1][1] !== undefined ? Number(results[1][1]) : 0;
          return { currentMessages, currentTokens };
        }
      }
    } catch {
      // In-memory fallback
    }

    const memKey = `${tenantId}:${period}`;
    const curr = this.inMemoryCounters.get(memKey) || { messages: 0, tokens: 0 };
    curr.messages += messagesCount;
    curr.tokens += tokensCount;
    this.inMemoryCounters.set(memKey, curr);

    return { currentMessages: curr.messages, currentTokens: curr.tokens };
  }

  /**
   * Retrieves current monthly usage for a tenant
   */
  async getUsage(tenantId: string, period?: string): Promise<{ messages: number; tokens: number }> {
    const targetPeriod = period || this.getCurrentPeriod();
    const msgKey = this.getKey(tenantId, targetPeriod, 'messages');
    const tokenKey = this.getKey(tenantId, targetPeriod, 'tokens');

    try {
      if (redisClient && redisClient.status === 'ready') {
        const [msgs, tkns] = await Promise.race([
          Promise.all([redisClient.get(msgKey), redisClient.get(tokenKey)]),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 200))
        ]) as any;

        return {
          messages: Number(msgs || 0),
          tokens: Number(tkns || 0)
        };
      }
    } catch {
      // In-memory fallback
    }

    const memKey = `${tenantId}:${targetPeriod}`;
    return this.inMemoryCounters.get(memKey) || { messages: 0, tokens: 0 };
  }

  /**
   * Checks whether tenant is within their plan's monthly message quota
   */
  async checkQuota(tenantId: string): Promise<QuotaCheckResult> {
    let planId = 'starter';

    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { planId: true, status: true }
        });
      });

      const tenant = await Promise.race([
        dbPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 200))
      ]);

      if (tenant?.planId) {
        planId = tenant.planId;
      }
    } catch {
      // Default to starter
    }

    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.trial;
    const { messages } = await this.getUsage(tenantId);
    const limit = plan.messageLimit;
    const remaining = Math.max(0, limit - messages);
    const allowed = messages < limit;

    return {
      allowed,
      planId,
      currentUsage: messages,
      limit,
      remaining,
      exceededBy: allowed ? 0 : messages - limit
    };
  }

  /**
   * Syncs Redis usage metrics into PostgreSQL UsageMetric table
   */
  async syncUsageToDatabase(tenantId: string, period?: string): Promise<void> {
    const targetPeriod = period || this.getCurrentPeriod();
    const usage = await this.getUsage(tenantId, targetPeriod);

    // Calculate approximate token cost ($0.002 per 1K tokens)
    const costEstimate = (usage.tokens / 1000) * 0.002;

    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return (prisma as any).usageMetric.upsert({
          where: {
            tenantId_periodMonth: {
              tenantId,
              periodMonth: targetPeriod
            }
          },
          create: {
            tenantId,
            periodMonth: targetPeriod,
            messageCount: usage.messages,
            tokenCount: usage.tokens,
            costEstimate
          },
          update: {
            messageCount: usage.messages,
            tokenCount: usage.tokens,
            costEstimate
          }
        });
      });

      await Promise.race([
        dbPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 300))
      ]);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Resets counter for testing
   */
  resetCounters(): void {
    this.inMemoryCounters.clear();
  }
}

export const quotaService = new QuotaService();
