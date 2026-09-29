import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@saas/database';
import { whatsAppService } from './whatsapp.service';
import { MetaWebhookPayload } from './whatsapp.mapper';

export async function whatsAppRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/channels/whatsapp/:channelId/webhook
   * Verification challenge initiated by Meta Developer Portal when registering webhook.
   */
  fastify.get('/:channelId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { channelId } = request.params as { channelId: string };
    const query = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode !== 'subscribe' || !token || !challenge) {
      return reply.status(400).send('Invalid verification request');
    }

    let expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    try {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
      });
      if (channel && (channel.credentials as any)?.verifyToken) {
        expectedToken = (channel.credentials as any).verifyToken;
      }
    } catch (e) {
      // Fallback to environment verify token
    }

    if (token === expectedToken) {
      // Respond with challenge string as plain text per Meta requirement
      return reply.status(200).type('text/plain').send(challenge);
    } else {
      return reply.status(403).send('Verification token mismatch');
    }
  });

  /**
   * POST /api/v1/channels/whatsapp/:channelId/webhook
   * Inbound event receiver for messages, statuses, and interactive replies.
   */
  fastify.post('/:channelId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { channelId } = request.params as { channelId: string };
    const signature = request.headers['x-hub-signature-256'] as string | undefined;

    // Verify HMAC signature
    const isValid = whatsAppService.verifySignature(JSON.stringify(request.body), signature);
    if (!isValid) {
      return reply.status(401).send({ success: false, error: 'Invalid webhook signature' });
    }

    try {
      // Process payload asynchronously
      const result = await whatsAppService.processInboundWebhook(
        channelId,
        request.body as MetaWebhookPayload
      );

      // Meta requires immediate 200 OK acknowledgment within 3 seconds
      return reply.status(200).send({ success: true, ...result });
    } catch (error: any) {
      request.log.error(error);
      // Return 200 even on error to prevent Meta from disabling the webhook endpoint
      return reply.status(200).send({ success: false, error: error.message });
    }
  });
}
