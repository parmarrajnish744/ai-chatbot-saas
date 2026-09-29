import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { stripeService } from './stripe.service';
import { quotaService } from './quota.service';
import { authenticateJwt } from '../../middlewares/rbac.middleware';

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  const getTenantId = (req: FastifyRequest) => {
    return (
      req.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      (req.user as any)?.tenantId ||
      '11111111-1111-1111-1111-111111111111'
    );
  };

  // Public: GET /api/v1/billing/plans
  fastify.get('/plans', async (_req: FastifyRequest, reply: FastifyReply) => {
    const plans = stripeService.getPlans();
    return reply.send({ success: true, data: plans });
  });

  // Protected: GET /api/v1/billing/usage
  fastify.get('/usage', { preHandler: authenticateJwt }, async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(req);
    const quota = await quotaService.checkQuota(tenantId);
    const usage = await quotaService.getUsage(tenantId);
    return reply.send({
      success: true,
      data: {
        ...quota,
        tokensUsed: usage.tokens,
        estimatedCostUsd: (usage.tokens / 1000) * 0.002
      }
    });
  });

  // Protected: POST /api/v1/billing/checkout
  fastify.post('/checkout', { preHandler: authenticateJwt }, async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(req);
    const { planId, successUrl, cancelUrl } = req.body as any;

    if (!planId) {
      return reply.status(400).send({ success: false, error: 'planId is required' });
    }

    try {
      const session = await stripeService.createCheckoutSession(
        tenantId,
        planId,
        successUrl || 'http://localhost:3000/dashboard/billing?status=success',
        cancelUrl || 'http://localhost:3000/dashboard/billing?status=cancelled'
      );
      return reply.send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Protected: POST /api/v1/billing/portal
  fastify.post('/portal', { preHandler: authenticateJwt }, async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(req);
    const { returnUrl } = req.body as any;

    const portal = await stripeService.createPortalSession(
      tenantId,
      returnUrl || 'http://localhost:3000/dashboard/billing'
    );
    return reply.send({ success: true, data: portal });
  });

  // Public Webhook: POST /api/v1/billing/webhook
  fastify.post('/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (signature && !stripeService.verifyWebhookSignature(rawBody, signature)) {
      return reply.status(400).send({ error: 'Invalid Stripe webhook signature' });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const result = await stripeService.handleWebhookEvent(event);

    return reply.send({ received: true, ...result });
  });
}
