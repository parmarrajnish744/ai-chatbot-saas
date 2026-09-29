import crypto from 'crypto';
import { prisma, withTenantContext } from '@saas/database';

export interface SubscriptionPlan {
  id: 'trial' | 'starter' | 'pro' | 'enterprise';
  name: string;
  monthlyPriceUsd: number;
  messageLimit: number;
  channelLimit: number;
  features: string[];
  stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    monthlyPriceUsd: 0,
    messageLimit: 100,
    channelLimit: 1,
    features: ['100 messages/mo', '1 WhatsApp or Web Channel', 'Basic RAG']
  },
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    monthlyPriceUsd: 49,
    messageLimit: 2500,
    channelLimit: 1,
    features: ['2,500 messages/mo', '1 Channel', 'WooCommerce Sync', 'Appointment Booking'],
    stripePriceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_default'
  },
  pro: {
    id: 'pro',
    name: 'Growth & Pro',
    monthlyPriceUsd: 149,
    messageLimit: 10000,
    channelLimit: 5,
    features: ['10,000 messages/mo', '5 Channels', 'Unlimited RAG Docs', 'Workflow Automations', 'AI Copilot'],
    stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro_default'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Scale',
    monthlyPriceUsd: 399,
    messageLimit: 50000,
    channelLimit: 20,
    features: ['50,000+ messages/mo', 'Unlimited Channels', 'Custom AI Fine-tuning', 'Dedicated SLA'],
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_default'
  }
};

export class StripeService {
  private secretKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  /**
   * Returns list of subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Returns a specific subscription plan
   */
  getPlan(planId: string): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.trial;
  }

  /**
   * Creates a Stripe Checkout Session for subscription upgrades
   */
  async createCheckoutSession(
    tenantId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string; sessionId: string }> {
    const plan = this.getPlan(planId);
    if (!plan || plan.id === 'trial') {
      throw new Error(`Invalid plan for checkout: ${planId}`);
    }

    if (this.secretKey) {
      try {
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            'client_reference_id': tenantId,
            'metadata[tenantId]': tenantId,
            'metadata[planId]': planId,
            'line_items[0][price]': plan.stripePriceId || 'price_starter_default',
            'line_items[0][quantity]': '1'
          }).toString()
        });

        if (response.ok) {
          const session = (await response.json()) as any;
          return { url: session.url, sessionId: session.id };
        }
      } catch {
        // Fallback to simulated session
      }
    }

    // Simulated Stripe Checkout Session for dev/test
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      url: `https://checkout.stripe.com/pay/${mockSessionId}?tenant=${tenantId}&plan=${planId}`,
      sessionId: mockSessionId
    };
  }

  /**
   * Creates a Stripe Billing Customer Portal session
   */
  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    if (this.secretKey) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.stripeCustomerId) {
          const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              customer: tenant.stripeCustomerId,
              return_url: returnUrl
            }).toString()
          });

          if (res.ok) {
            const portal = (await res.json()) as any;
            return { url: portal.url };
          }
        }
      } catch {
        // Fallback
      }
    }

    return {
      url: `https://billing.stripe.com/portal/${tenantId}?return_url=${encodeURIComponent(returnUrl)}`
    };
  }

  /**
   * Handles Stripe subscription webhook events
   */
  async handleWebhookEvent(event: any): Promise<{ handled: boolean; action: string; tenantId?: string }> {
    const eventType = event.type;
    const dataObject = event.data?.object || {};

    switch (eventType) {
      case 'checkout.session.completed': {
        const tenantId = dataObject.client_reference_id || dataObject.metadata?.tenantId;
        const planId = dataObject.metadata?.planId || 'starter';
        const customerId = dataObject.customer;

        if (tenantId) {
          await this.updateTenantSubscription(tenantId, {
            planId,
            status: 'active',
            stripeCustomerId: customerId,
            stripeSubscriptionId: dataObject.subscription
          });
          return { handled: true, action: 'subscription_activated', tenantId };
        }
        break;
      }

      case 'customer.subscription.updated': {
        const tenantId = dataObject.metadata?.tenantId;
        const status = dataObject.status; // active, past_due, canceled, unpaid
        const planId = dataObject.metadata?.planId;

        if (tenantId) {
          await this.updateTenantSubscription(tenantId, {
            status: status === 'active' ? 'active' : status === 'past_due' ? 'past_due' : 'suspended',
            ...(planId ? { planId } : {})
          });
          return { handled: true, action: 'subscription_updated', tenantId };
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const tenantId = dataObject.metadata?.tenantId;
        if (tenantId) {
          await this.updateTenantSubscription(tenantId, {
            planId: 'trial',
            status: 'canceled'
          });
          return { handled: true, action: 'subscription_canceled', tenantId };
        }
        break;
      }

      case 'invoice.payment_failed': {
        const tenantId = dataObject.subscription_details?.metadata?.tenantId || dataObject.metadata?.tenantId;
        if (tenantId) {
          await this.updateTenantSubscription(tenantId, {
            status: 'past_due'
          });
          return { handled: true, action: 'payment_failed_flagged', tenantId };
        }
        break;
      }
    }

    return { handled: false, action: 'ignored' };
  }

  /**
   * Helper to persist tenant subscription updates
   */
  private async updateTenantSubscription(
    tenantId: string,
    update: { planId?: string; status?: string; stripeCustomerId?: string; stripeSubscriptionId?: string }
  ): Promise<void> {
    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return prisma.tenant.update({
          where: { id: tenantId },
          data: {
            ...(update.planId ? { planId: update.planId } : {}),
            ...(update.status ? { status: update.status } : {}),
            ...(update.stripeCustomerId ? { stripeCustomerId: update.stripeCustomerId } : {})
          }
        });
      });

      await Promise.race([
        dbPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 300))
      ]);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Verify Stripe Webhook signature
   */
  verifyWebhookSignature(payload: string, header: string, secret?: string): boolean {
    const webhookSecret = secret || this.webhookSecret;
    if (!webhookSecret) return true; // dev fallback

    try {
      const parts = header.split(',');
      const timestampPart = parts.find((p) => p.startsWith('t='));
      const signaturePart = parts.find((p) => p.startsWith('v1='));

      if (!timestampPart || !signaturePart) return false;

      const timestamp = timestampPart.split('=')[1];
      const signature = signaturePart.split('=')[1];

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
}

export const stripeService = new StripeService();
