export interface SendWhatsAppMessageOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text?: string;
  buttons?: Array<{ id: string; title: string }>;
  template?: {
    name: string;
    languageCode: string;
    parameters?: Array<{ type: 'text' | 'image'; value: string }>;
  };
}

export class WhatsAppClient {
  private apiVersion = 'v19.0';
  private baseUrl = 'https://graph.facebook.com';

  /**
   * Sends an outbound message to Meta WhatsApp Cloud API.
   */
  async sendMessage(options: SendWhatsAppMessageOptions): Promise<{ messageId: string }> {
    const url = `${this.baseUrl}/${this.apiVersion}/${options.phoneNumberId}/messages`;

    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.to,
    };

    if (options.template) {
      // 1. Template Message (Mandatory outside 24h window)
      payload.type = 'template';
      payload.template = {
        name: options.template.name,
        language: { code: options.template.languageCode },
        components: options.template.parameters ? [
          {
            type: 'body',
            parameters: options.template.parameters.map((p) => ({
              type: 'text',
              text: p.value,
            })),
          },
        ] : undefined,
      };
    } else if (options.buttons && options.buttons.length > 0) {
      // 2. Interactive Buttons (Up to 3 quick-reply buttons)
      payload.type = 'interactive';
      payload.interactive = {
        type: 'button',
        body: { text: options.text || 'Please select an option:' },
        action: {
          buttons: options.buttons.slice(0, 3).map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.substring(0, 20) },
          })),
        },
      };
    } else {
      // 3. Standard Text Message
      payload.type = 'text';
      payload.text = { body: options.text || '' };
    }

    // In local development or testing with mock token, simulate successful response
    if (process.env.NODE_ENV === 'test' || options.accessToken.startsWith('mock_')) {
      return { messageId: 'wamid.MOCK_' + Date.now() };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error [${response.status}]: ${errorText}`);
    }

    const data: any = await response.json();
    return { messageId: data.messages?.[0]?.id || 'wamid.unknown' };
  }
}

export const whatsAppClient = new WhatsAppClient();
