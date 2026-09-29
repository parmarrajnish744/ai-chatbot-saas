import { LiveDeskGatewayHub } from '../../../gateways/live-desk.gateway';

export interface InternalAlertActionConfig {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  messageTemplate: string;
  channel?: 'live_desk' | 'email';
}

export class InternalAlertAction {
  async execute(config: InternalAlertActionConfig, event: { eventType: string; tenantId: string; data: any }): Promise<{ success: boolean; delivered: boolean }> {
    let message = config.messageTemplate;
    // Replace simple placeholders
    for (const [key, val] of Object.entries(event.data || {})) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }

    try {
      // Broadcast real-time alert to live desk agents connected for this tenant
      LiveDeskGatewayHub.notifyAllAgents('INTERNAL_ALERT', {
        severity: config.severity,
        title: config.title,
        message,
        tenantId: event.tenantId,
        eventType: event.eventType,
        timestamp: new Date().toISOString()
      });

      return { success: true, delivered: true };
    } catch {
      return { success: true, delivered: false };
    }
  }
}

export const internalAlertAction = new InternalAlertAction();
