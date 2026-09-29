import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from './analytics.service';
import { authenticateJwt } from '../../middlewares/rbac.middleware';

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticateJwt);

  const getTenantId = (req: FastifyRequest) => {
    return (
      req.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      (req.user as any)?.tenantId ||
      '11111111-1111-1111-1111-111111111111'
    );
  };

  // GET /api/v1/analytics/overview
  fastify.get('/overview', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(req);
    const query = req.query as { days?: string };
    const days = query.days ? parseInt(query.days, 10) : 30;

    const data = await analyticsService.getOverview(tenantId, days);
    return reply.send({ success: true, data });
  });

  // GET /api/v1/analytics/trends
  fastify.get('/trends', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(req);
    const query = req.query as { days?: string };
    const days = query.days ? parseInt(query.days, 10) : 7;

    const data = await analyticsService.getDailyTrends(tenantId, days);
    return reply.send({ success: true, data });
  });
}
