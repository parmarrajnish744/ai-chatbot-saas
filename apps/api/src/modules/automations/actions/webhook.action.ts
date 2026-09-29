import crypto from 'crypto';

export interface WebhookActionConfig {
  url: string;
  secret?: string;
  customHeaders?: Record<string, string>;
  includeFullPayload?: boolean;
}

export class WebhookAction {
  /**
   * Dispatches signed HTTP POST payload to external webhook destination
   */
  async execute(
    config: WebhookActionConfig,
    event: { eventType: string; tenantId: string; timestamp: string; data: any }
  ): Promise<{ success: boolean; statusCode?: number; error?: string; body?: string }> {
    if (!config.url || !config.url.startsWith('http')) {
      return { success: false, error: 'Invalid destination webhook URL' };
    }

    const payload = JSON.stringify({
      event: event.eventType,
      tenantId: event.tenantId,
      timestamp: event.timestamp,
      data: event.data
    });

    const timestamp = new Date().toISOString();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Saas-Event': event.eventType,
      'X-Saas-Timestamp': timestamp,
      'User-Agent': 'SaaS-AI-Chatbot-Engine/1.0',
      ...(config.customHeaders || {})
    };

    // Calculate HMAC-SHA256 signature if secret is provided
    if (config.secret) {
      const hmac = crypto.createHmac('sha256', config.secret);
      hmac.update(`${timestamp}.${payload}`);
      headers['X-Saas-Signature'] = `sha256=${hmac.digest('hex')}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout guard

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal
      });

      const responseText = await response.text();
      return {
        success: response.ok,
        statusCode: response.status,
        body: responseText.slice(0, 500) // Truncate response
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Webhook request timed out after 10s' : err.message
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const webhookAction = new WebhookAction();
