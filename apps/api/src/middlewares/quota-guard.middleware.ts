import { FastifyRequest, FastifyReply } from 'fastify';
import { quotaService } from '../modules/billing/quota.service';

export async function quotaGuardMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenantId =
    request.tenantId ||
    (request.headers['x-tenant-id'] as string) ||
    (request.user as any)?.tenantId ||
    '11111111-1111-1111-1111-111111111111';

  const quota = await quotaService.checkQuota(tenantId);
  if (!quota.allowed) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'PLAN_QUOTA_EXCEEDED',
        message: `Tenant has reached monthly message limit (${quota.currentUsage}/${quota.limit}). Please upgrade your plan.`,
        planId: quota.planId,
        upgradeUrl: '/billing/upgrade'
      }
    });
  }
}
