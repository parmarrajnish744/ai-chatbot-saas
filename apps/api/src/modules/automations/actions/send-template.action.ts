import { whatsAppService } from '../../channels/whatsapp/whatsapp.service';

export interface SendTemplateActionConfig {
  templateName: string;
  languageCode?: string;
  recipientPhoneField?: string; // field in event.data where phone is located (default 'phone')
  variables?: Record<string, string>; // mapping template variable to event data path, e.g. { "1": "name", "2": "startTime" }
}

export class SendTemplateAction {
  /**
   * Helper to interpolate variables from an object by dot-notation path
   */
  private resolveValue(path: string, obj: any): string {
    if (!obj) return '';
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === undefined || curr === null) return '';
      curr = curr[part];
    }
    return String(curr ?? '');
  }

  async execute(config: SendTemplateActionConfig, eventData: any, channelId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneField = config.recipientPhoneField || 'phone';
    const recipientPhone = this.resolveValue(phoneField, eventData) || eventData.customerPhone || eventData.phone;

    if (!recipientPhone) {
      return { success: false, error: `Recipient phone number missing in event data at field '${phoneField}'` };
    }

    // Interpolate template parameters
    const parameters: string[] = [];
    if (config.variables) {
      for (const [_, path] of Object.entries(config.variables)) {
        parameters.push(this.resolveValue(path, eventData));
      }
    }

    try {
      if (channelId) {
        const res = await whatsAppService.sendTemplateMessage(
          channelId,
          recipientPhone,
          config.templateName,
          config.languageCode || 'en_US',
          parameters
        );
        return { success: true, messageId: res.messages?.[0]?.id };
      } else {
        // Fallback or dry-run simulated send
        return {
          success: true,
          messageId: `sim_tpl_${Date.now()}`
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const sendTemplateAction = new SendTemplateAction();
