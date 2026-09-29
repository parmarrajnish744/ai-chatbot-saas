import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ConversationStatus } from '@saas/shared-types';
import { conversationStateService } from './conversation-state.service';
import { outboundDispatcher } from '../channels/outbound.dispatcher';
import { prisma } from '@saas/database';

const updateStatusSchema = z.object({
  status: z.enum(['BOT_ACTIVE', 'HANDOFF_QUEUED', 'AGENT_ACTIVE', 'RESOLVED', 'CLOSED']),
  reason: z.string().optional(),
});

const assignAgentSchema = z.object({
  agentUserId: z.string().uuid(),
});

const addNoteSchema = z.object({
  note: z.string().min(1),
});

const sendMessageSchema = z.object({
  text: z.string().min(1),
});

export async function conversationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/conversations
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string);
    const query = request.query as { status?: ConversationStatus; assignedTo?: string };

    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant context required' });
    }

    const conversations = await conversationStateService.listConversations(tenantId, query);
    return reply.status(200).send({ success: true, data: conversations });
  });

  /**
   * PATCH /api/v1/conversations/:id/status
   */
  fastify.patch('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const body = updateStatusSchema.parse(request.body);
      const agentUserId = request.user?.userId;

      const result = await conversationStateService.transitionState(id, body.status, {
        agentUserId,
        reason: body.reason,
      });

      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: { message: error.message } });
    }
  });

  /**
   * POST /api/v1/conversations/:id/notes
   */
  fastify.post('/:id/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string) || 'default-tenant';
    const authorUserId = request.user?.userId || 'agent_01';

    try {
      const body = addNoteSchema.parse(request.body);
      const note = await conversationStateService.addInternalNote(tenantId, id, authorUserId, body.note);
      return reply.status(201).send({ success: true, data: note });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: { message: error.message } });
    }
  });

  /**
   * POST /api/v1/conversations/:id/messages (Live human agent sending message)
   */
  fastify.post('/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string) || 'default-tenant';

    try {
      const body = sendMessageSchema.parse(request.body);

      let conv: any = null;
      try {
        conv = await prisma.conversation.findUnique({
          where: { id },
          include: { contact: true, channel: true },
        });
      } catch (err) {}

      const channelType = conv?.channel?.type || 'WHATSAPP';
      const channelId = conv?.channelId || 'channel_01';
      const recipientId = conv?.contact?.phone || '+15551234567';

      // Dispatch agent message out to customer
      const dispatchResult = await outboundDispatcher.dispatch({
        tenantId,
        conversationId: id,
        channelId,
        channelType,
        recipientId,
        content: {
          type: 'TEXT',
          text: body.text,
        },
      });

      return reply.status(200).send({ success: true, data: dispatchResult });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: { message: error.message } });
    }
  });
}
