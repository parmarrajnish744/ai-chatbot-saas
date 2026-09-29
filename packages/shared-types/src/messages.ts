import { ChannelType, MessageContentType } from './channels';

export interface InboundMessagePayload {
  tenantId: string;
  channelId: string;
  channelType: ChannelType;
  channelMessageId: string;
  sender: {
    externalId: string; // E.164 phone or web session token
    name?: string;
  };
  recipient: {
    channelIdentifier: string; // Business WhatsApp Number or Widget ID
  };
  message: {
    type: MessageContentType;
    text?: string;
    mediaUrl?: string;
    mimeType?: string;
    buttonPayload?: string;
    location?: { latitude: number; longitude: number };
  };
  timestamp: string; // ISO 8601
}

export interface OutboundMessagePayload {
  tenantId: string;
  conversationId: string;
  channelId: string;
  channelType: ChannelType;
  recipientId: string; // Customer phone or session ID
  content: {
    type: 'TEXT' | 'INTERACTIVE_BUTTONS' | 'LIST_MENU' | 'MEDIA' | 'TEMPLATE';
    text?: string;
    mediaUrl?: string;
    buttons?: Array<{ id: string; title: string }>;
    listMenu?: {
      buttonTitle: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
    template?: {
      name: string;
      languageCode: string;
      parameters: Array<{ type: 'text' | 'image'; value: string }>;
    };
  };
}
