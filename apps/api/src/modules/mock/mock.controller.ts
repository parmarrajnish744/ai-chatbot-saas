import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saas/database';
import { queueService } from '../../queues/queue.service';
import { InboundMessagePayload } from '@saas/shared-types';
import { agentOrchestrator } from '../ai/agent.orchestrator';
import { LiveDeskGatewayHub } from '../../gateways/live-desk.gateway';

const mockWhatsAppSchema = z.object({
  tenantId: z.string().optional().default('00000000-0000-0000-0000-000000000001'),
  senderPhone: z.string().optional(),
  phone: z.string().optional(),
  senderName: z.string().optional(),
  name: z.string().optional(),
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
      const raw = request.body as any;
      const parsed = mockWhatsAppSchema.parse(raw);

      const tenantId = parsed.tenantId || (request.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001';
      const senderPhone = parsed.senderPhone || parsed.phone || '+14155552671';
      const senderName = parsed.senderName || parsed.name || 'Mock Customer';

      let channelId = 'mock-channel-' + tenantId;
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { channels: true },
        });
        if (tenant?.channels?.length) {
          channelId = tenant.channels[0].id;
        }
      } catch (e) {}

      const normalized: InboundMessagePayload = {
        tenantId,
        channelId,
        channelType: 'WHATSAPP',
        channelMessageId: 'wamid.MOCK_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        sender: {
          externalId: senderPhone,
          name: senderName,
        },
        recipient: {
          channelIdentifier: '+15550000000',
        },
        message: {
          type: parsed.buttonPayload ? 'INTERACTIVE_BUTTONS' : 'TEXT',
          text: parsed.text,
          buttonPayload: parsed.buttonPayload,
        },
        timestamp: new Date().toISOString(),
      };

      // Try enqueue if queue is ready
      try {
        await queueService.enqueueInbound(normalized);
      } catch (e) {}

      // Execute autonomous ReAct turn with LLM (Gemini / fallback)
      const botReply = await agentOrchestrator.runReActLoop({
        systemPrompt: 'You are an intelligent, helpful omnichannel customer assistant.',
        userMessage: parsed.text,
        history: [],
        context: {
          tenantId,
          conversationId: 'mock-conv-' + senderPhone.replace(/\D/g, ''),
        },
      });

      // Broadcast to Live Desk WebSocket stream
      try {
        LiveDeskGatewayHub.notifyAllAgents('new_message', {
          conversationId: 'mock-conv-' + senderPhone.replace(/\D/g, ''),
          message: {
            senderType: 'BOT',
            text: botReply,
          },
        });
      } catch (e) {}

      return reply.status(200).send({
        success: true,
        data: {
          message: 'Mock WhatsApp message processed successfully',
          reply: botReply,
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
