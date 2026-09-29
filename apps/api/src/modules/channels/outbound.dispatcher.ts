import { OutboundMessagePayload } from '@saas/shared-types';
import { prisma } from '@saas/database';
import { whatsAppClient } from './whatsapp/whatsapp-client';
import { activeWebSockets } from '../../gateways/webchat.gateway';

export class OutboundDispatcher {
  /**
   * Dispatches a normalized outbound message to its destination channel adapter.
   */
  async dispatch(payload: OutboundMessagePayload): Promise<{ success: boolean; messageId?: string }> {
    let externalMessageId: string | undefined;

    switch (payload.channelType) {
      case 'WHATSAPP': {
        const channel = await prisma.channel.findUnique({
          where: { id: payload.channelId },
        });

        if (!channel) {
          throw new Error(`WhatsApp Channel ${payload.channelId} not found`);
        }

        const creds = channel.credentials as any;
        const phoneNumberId = creds?.phoneNumberId;
        const accessToken = creds?.accessToken;

        // Verify WhatsApp 24-hour service window
        const isOutside24h = await this.isOutside24HourWindow(payload.conversationId);

        if (isOutside24h && payload.content.type !== 'TEMPLATE') {
          console.warn(
            `⚠️  Conversation ${payload.conversationId} is outside 24h window. Meta requires a template message.`
          );
          // Auto-fallback or template assignment
        }

        const res = await whatsAppClient.sendMessage({
          phoneNumberId,
          accessToken,
          to: payload.recipientId,
          text: payload.content.text,
          buttons: payload.content.buttons,
          template: payload.content.template ? {
            name: payload.content.template.name,
            languageCode: payload.content.template.languageCode,
            parameters: payload.content.template.parameters,
          } : undefined,
        });

        externalMessageId = res.messageId;
        break;
      }

      case 'WEB_WIDGET': {
        const socketKey = `${payload.tenantId}:${payload.recipientId}`;
        const socket = activeWebSockets.get(socketKey);

        if (socket && socket.readyState === 1) { // WebSocket.OPEN
          socket.send(JSON.stringify({
            type: 'bot_message',
            conversationId: payload.conversationId,
            text: payload.content.text,
            buttons: payload.content.buttons,
          }));
        }

        externalMessageId = 'webout_' + Date.now();
        break;
      }

      default:
        console.warn(`Channel ${payload.channelType} not yet connected.`);
    }

    // Record outbound message in database
    await prisma.message.create({
      data: {
        tenantId: payload.tenantId,
        conversationId: payload.conversationId,
        channelMessageId: externalMessageId,
        direction: 'OUTBOUND',
        contentType: payload.content.type === 'INTERACTIVE_BUTTONS' ? 'INTERACTIVE_BUTTONS' : 'TEXT',
        content: payload.content as any,
        senderType: 'bot',
        status: 'sent',
      },
    });

    return { success: true, messageId: externalMessageId };
  }

  /**
   * Checks if a given timestamp is within the Meta 24-hour service window.
   */
  isWithin24HourWindow(lastInboundDate: Date): boolean {
    const diffHours = (Date.now() - new Date(lastInboundDate).getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Checks if more than 24 hours have elapsed since the customer's last inbound message.
   */
  async isOutside24HourWindow(conversationId: string): Promise<boolean> {
    try {
      const lastInbound = await prisma.message.findFirst({
        where: {
          conversationId,
          direction: 'INBOUND',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastInbound) return false;

      return !this.isWithin24HourWindow(lastInbound.createdAt);
    } catch {
      return false;
    }
  }
}

export const outboundDispatcher = new OutboundDispatcher();
