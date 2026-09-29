import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saas/database';
import { queueService } from '../../queues/queue.service';
import { InboundMessagePayload } from '@saas/shared-types';

const mockWhatsAppSchema = z.object({
  tenantId: z.string().uuid(),
  senderPhone: z.string().min(5),
  senderName: z.string().optional().default('Mock Customer'),
  text: z.string().min(1),
  buttonPayload: z.string().optional(),
});

export async function mockRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/mock/whatsapp-inbound
   * Simulates an inbound WhatsApp user message for local development & testing.
   */
  fastify.post('/whatsapp-inbound', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = mockWhatsAppSchema.parse(request.body);

      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: body.tenantId },
        include: { channels: true },
      });

      if (!tenant) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant does not exist' },
        });
      }

      const channel = tenant.channels.find((c) => c.type === 'WHATSAPP') || tenant.channels[0];
      const channelId = channel ? channel.id : 'mock-channel-' + tenant.id;

      const normalized: InboundMessagePayload = {
        tenantId: tenant.id,
        channelId,
        channelType: 'WHATSAPP',
        channelMessageId: 'wamid.MOCK_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        sender: {
          externalId: body.senderPhone,
          name: body.senderName,
        },
        recipient: {
          channelIdentifier: channel ? channel.identifier : '+15550000000',
        },
        message: {
          type: body.buttonPayload ? 'INTERACTIVE_BUTTONS' : 'TEXT',
          text: body.text,
          buttonPayload: body.buttonPayload,
        },
        timestamp: new Date().toISOString(),
      };

      // Push into BullMQ processing queue
      await queueService.enqueueInbound(normalized);

      return reply.status(200).send({
        success: true,
        data: {
          message: 'Mock WhatsApp message queued successfully',
          channelMessageId: normalized.channelMessageId,
          payload: normalized,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MOCK_ERROR', message: error.message },
      });
    }
  });
}
