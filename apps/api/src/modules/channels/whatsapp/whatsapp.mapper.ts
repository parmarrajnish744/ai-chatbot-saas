import { InboundMessagePayload, MessageContentType } from '@saas/shared-types';

export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string; sha256: string; caption?: string };
          audio?: { id: string; mime_type: string };
          video?: { id: string; mime_type: string };
          document?: { id: string; filename: string; mime_type: string };
          button?: { payload: string; text: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
          location?: { latitude: number; longitude: number; name?: string };
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppMapper {
  static toInboundMessage(
    payload: MetaWebhookPayload,
    tenantId: string,
    channelId: string
  ): InboundMessagePayload | null {
    const change = payload.entry?.[0]?.changes?.[0]?.value;
    if (!change || !change.messages || change.messages.length === 0) {
      return null;
    }

    const rawMsg = change.messages[0];
    const contact = change.contacts?.[0];
    const senderPhone = rawMsg.from;
    const recipientPhone = change.metadata.display_phone_number;

    let contentType: MessageContentType = 'TEXT';
    let text = rawMsg.text?.body;
    let buttonPayload: string | undefined;

    if (rawMsg.type === 'interactive') {
      contentType = 'INTERACTIVE_BUTTONS';
      buttonPayload = rawMsg.interactive?.button_reply?.id || rawMsg.interactive?.list_reply?.id;
      text = rawMsg.interactive?.button_reply?.title || rawMsg.interactive?.list_reply?.title;
    } else if (rawMsg.type === 'button') {
      contentType = 'INTERACTIVE_BUTTONS';
      buttonPayload = rawMsg.button?.payload;
      text = rawMsg.button?.text;
    } else if (rawMsg.type === 'image') {
      contentType = 'IMAGE';
      text = rawMsg.image?.caption;
    } else if (rawMsg.type === 'audio') {
      contentType = 'AUDIO';
    } else if (rawMsg.type === 'document') {
      contentType = 'DOCUMENT';
    } else if (rawMsg.type === 'location') {
      contentType = 'LOCATION';
    }

    return {
      tenantId,
      channelId,
      channelType: 'WHATSAPP',
      channelMessageId: rawMsg.id,
      sender: {
        externalId: senderPhone,
        name: contact?.profile?.name || senderPhone,
      },
      recipient: {
        channelIdentifier: recipientPhone,
      },
      message: {
        type: contentType,
        text,
        buttonPayload,
        location: rawMsg.location ? {
          latitude: rawMsg.location.latitude,
          longitude: rawMsg.location.longitude,
        } : undefined,
      },
      timestamp: new Date(Number(rawMsg.timestamp) * 1000).toISOString(),
    };
  }
}
