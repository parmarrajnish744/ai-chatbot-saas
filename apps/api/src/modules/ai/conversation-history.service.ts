import { prisma } from '@saas/database';
import { InboundMessagePayload } from '@saas/shared-types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ConversationHistoryService {
  /**
   * Retrieves or creates a Contact and an active Conversation for an inbound message.
   */
  async getOrCreateConversation(inbound: InboundMessagePayload) {
    const { tenantId, channelId, sender } = inbound;

    // 1. Find or create Contact
    let contact = await prisma.contact.findFirst({
      where: {
        tenantId,
        phone: sender.externalId,
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId,
          phone: sender.externalId,
          name: sender.name || 'New Lead',
          stage: 'lead',
        },
      });
    }

    // 2. Find active conversation or create new one
    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantId,
        channelId,
        contactId: contact.id,
        status: { in: ['BOT_ACTIVE', 'HANDOFF_QUEUED', 'AGENT_ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId,
          channelId,
          contactId: contact.id,
          status: 'BOT_ACTIVE',
        },
      });
    }

    // 3. Save incoming message record
    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        channelMessageId: inbound.channelMessageId,
        direction: 'INBOUND',
        contentType: inbound.message.type,
        content: inbound.message as any,
        senderType: 'customer',
        senderId: contact.id,
        status: 'delivered',
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return { contact, conversation, message };
  }

  /**
   * Builds formatted chat context for LLM prompt assembly.
   */
  async buildChatHistory(conversationId: string, limit: number = 10): Promise<ChatMessage[]> {
    let rawMessages: any[] = [];
    try {
      const findPromise = prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 300));
      rawMessages = ((await Promise.race([findPromise, timeout])) as any[]) || [];
    } catch (err) {}

    if (rawMessages.length === 0) {
      return [
        { role: 'user', content: 'Hello, I would like more information about your services.' },
      ];
    }

    // Chronological order
    const ordered = rawMessages.reverse();

    return ordered.map((msg) => {
      const content = msg.content as any;
      const text = content?.text || (content?.type === 'IMAGE' ? '[User sent an image]' : '');
      const role: 'user' | 'assistant' = msg.direction === 'INBOUND' ? 'user' : 'assistant';

      return {
        role,
        content: text,
      };
    });
  }
}

export const conversationHistoryService = new ConversationHistoryService();
