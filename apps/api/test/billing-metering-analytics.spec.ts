import { stripeService } from '../src/modules/billing/stripe.service';
import { quotaService } from '../src/modules/billing/quota.service';
import { analyticsService } from '../src/modules/analytics/analytics.service';
import { buildApp } from '../src/app';
import jwt from 'jsonwebtoken';

describe('Phase 7: Subscription Billing, Metering & Analytics', () => {
  const tenantId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    quotaService.resetCounters();
  });

  describe('Task 7.1: Stripe Billing & Lifecycle', () => {
    it('should list all subscription plans (trial, starter, pro, enterprise)', () => {
      const plans = stripeService.getPlans();
      expect(plans.length).toBe(4);

      const planIds = plans.map((p) => p.id);
      expect(planIds).toContain('trial');
      expect(planIds).toContain('starter');
      expect(planIds).toContain('pro');
      expect(planIds).toContain('enterprise');

      const starter = stripeService.getPlan('starter');
      expect(starter.monthlyPriceUsd).toBe(49);
      expect(starter.messageLimit).toBe(2500);
    });

    it('should create a checkout session for valid plan', async () => {
      const session = await stripeService.createCheckoutSession(
        tenantId,
        'starter',
        'http://localhost:3000/success',
        'http://localhost:3000/cancel'
      );

      expect(session.sessionId).toBeDefined();
      expect(session.url).toContain('checkout.stripe.com');
      expect(session.url).toContain(tenantId);
    });

    it('should create customer portal session', async () => {
      const portal = await stripeService.createPortalSession(tenantId, 'http://localhost:3000/dashboard');
      expect(portal.url).toContain('billing.stripe.com/portal');
    });

    it('should handle checkout.session.completed webhook event', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: tenantId,
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: { tenantId, planId: 'pro' }
          }
        }
      };

      const res = await stripeService.handleWebhookEvent(event);
      expect(res.handled).toBe(true);
      expect(res.action).toBe('subscription_activated');
      expect(res.tenantId).toBe(tenantId);
    });

    it('should handle customer.subscription.deleted webhook event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { tenantId }
          }
        }
      };

      const res = await stripeService.handleWebhookEvent(event);
      expect(res.handled).toBe(true);
      expect(res.action).toBe('subscription_canceled');
    });

    it('should handle invoice.payment_failed webhook event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            metadata: { tenantId }
          }
        }
      };

      const res = await stripeService.handleWebhookEvent(event);
      expect(res.handled).toBe(true);
      expect(res.action).toBe('payment_failed_flagged');
    });
  });

  describe('Task 7.2: Redis Real-time Metering & Quota Enforcer', () => {
    it('should atomically increment message and token counters', async () => {
      const usage1 = await quotaService.incrementUsage(tenantId, 1, 150);
      expect(usage1.currentMessages).toBe(1);
      expect(usage1.currentTokens).toBe(150);

      const usage2 = await quotaService.incrementUsage(tenantId, 4, 350);
      expect(usage2.currentMessages).toBe(5);
      expect(usage2.currentTokens).toBe(500);

      const current = await quotaService.getUsage(tenantId);
      expect(current.messages).toBe(5);
      expect(current.tokens).toBe(500);
    });

    it('should accurately calculate remaining quota and detect exceeded limits', async () => {
      // Starter plan limit is 2500
      const quotaBefore = await quotaService.checkQuota(tenantId);
      expect(quotaBefore.allowed).toBe(true);
      expect(quotaBefore.limit).toBe(2500);
      expect(quotaBefore.remaining).toBe(2500);

      // Simulate tenant consuming 2501 messages
      await quotaService.incrementUsage(tenantId, 2501, 10000);

      const quotaAfter = await quotaService.checkQuota(tenantId);
      expect(quotaAfter.allowed).toBe(false);
      expect(quotaAfter.currentUsage).toBe(2501);
      expect(quotaAfter.remaining).toBe(0);
      expect(quotaAfter.exceededBy).toBe(1);
    });

    it('should sync usage to database without throwing', async () => {
      await quotaService.incrementUsage(tenantId, 10, 500);
      await expect(quotaService.syncUsageToDatabase(tenantId)).resolves.not.toThrow();
    });
  });

  describe('Task 7.3: Analytics Aggregator', () => {
    it('should aggregate tenant performance overview', async () => {
      const overview = await analyticsService.getOverview(tenantId, 30);

      expect(overview.tenantId).toBe(tenantId);
      expect(overview.periodDays).toBe(30);
      expect(overview.totalConversations).toBeGreaterThanOrEqual(0);
      expect(overview.deflectionRatePercentage).toBeGreaterThanOrEqual(0);
      expect(overview.deflectionRatePercentage).toBeLessThanOrEqual(100);
      expect(overview.averageLatencyMs).toBeGreaterThan(0);
      expect(overview.channelDistribution.whatsapp).toBeDefined();
      expect(overview.channelDistribution.webchat).toBeDefined();
      expect(overview.tokensUsed).toBeGreaterThan(0);
      expect(overview.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    });

    it('should generate daily trend timeseries points', async () => {
      const trends = await analyticsService.getDailyTrends(tenantId, 7);

      expect(trends.length).toBe(7);
      expect(trends[0].date).toBeDefined();
      expect(trends[0].conversations).toBeDefined();
      expect(trends[0].messages).toBeDefined();
      expect(trends[0].appointments).toBeDefined();
    });
  });

  describe('Billing & Analytics API Endpoints', () => {
    const app = buildApp();
    const token = jwt.sign(
      { sub: 'usr_1', email: 'owner@acme.com', role: 'OWNER', tenantId },
      process.env.JWT_SECRET || 'dev_secret_jwt_key_super_secure'
    );

    afterAll(async () => {
      await app.close();
    });

    it('GET /api/v1/billing/plans should return plan list (public)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/billing/plans'
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(4);
    });

    it('GET /api/v1/billing/usage should return tenant usage and limits (protected)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/billing/usage',
        headers: { authorization: `Bearer ${token}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.limit).toBe(2500);
      expect(body.data.allowed).toBe(true);
    });

    it('POST /api/v1/billing/checkout should generate checkout url', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/billing/checkout',
        headers: { authorization: `Bearer ${token}` },
        payload: { planId: 'pro' }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.url).toContain('checkout.stripe.com');
    });

    it('POST /api/v1/billing/webhook should handle incoming stripe event', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/billing/webhook',
        payload: {
          type: 'customer.subscription.updated',
          data: {
            object: {
              status: 'active',
              metadata: { tenantId, planId: 'enterprise' }
            }
          }
        }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.received).toBe(true);
      expect(body.action).toBe('subscription_updated');
    });

    it('GET /api/v1/analytics/overview should return operational metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/overview?days=30',
        headers: { authorization: `Bearer ${token}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.deflectionRatePercentage).toBeDefined();
    });

    it('GET /api/v1/analytics/trends should return timeseries', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/trends?days=7',
        headers: { authorization: `Bearer ${token}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(7);
    });
  });
});
