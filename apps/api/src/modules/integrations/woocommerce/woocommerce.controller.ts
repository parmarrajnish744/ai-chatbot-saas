import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { productSyncService } from './product-sync.service';

const syncCatalogSchema = z.object({
  storeUrl: z.string().url(),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});

export async function wooCommerceRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/integrations/woocommerce/:tenantId/sync
   * Initiates catalog sync and vectorization.
   */
  fastify.post('/:tenantId/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const config = syncCatalogSchema.parse(request.body);
      const result = await productSyncService.syncCatalog(tenantId, config);

      return reply.status(200).send({
        success: true,
        data: {
          message: `Successfully synchronized ${result.syncedCount} products into database and RAG vectors.`,
          syncedCount: result.syncedCount,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SYNC_FAILED', message: error.message },
      });
    }
  });

  /**
   * POST /api/v1/integrations/woocommerce/:tenantId/webhook
   * Receiver for live WooCommerce webhook events.
   */
  fastify.post('/:tenantId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const topic = request.headers['x-wc-webhook-topic'] as string;
    const body: any = request.body;

    request.log.info({ tenantId, topic }, 'Received WooCommerce Webhook');

    // Acknowledge webhook immediately
    return reply.status(200).send({ success: true, event: topic });
  });
}
