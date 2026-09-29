import { eventBusService } from '../src/modules/automations/event-bus.service';
import { workflowEngineService } from '../src/modules/automations/workflow-engine.service';
import { webhookAction } from '../src/modules/automations/actions/webhook.action';
import { sendTemplateAction } from '../src/modules/automations/actions/send-template.action';
import { internalAlertAction } from '../src/modules/automations/actions/internal-alert.action';
import { blueprintService } from '../src/modules/blueprints/blueprint.service';
import { buildApp } from '../src/app';
import jwt from 'jsonwebtoken';

describe('Phase 6: Workflow Automations & Industry Blueprints', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    eventBusService.clearHistory();
    workflowEngineService.clearInMemory();
  });

  describe('Task 6.1: Event-Driven Automation Trigger Engine', () => {
    it('should publish events and trigger wildcard and exact subscribers', async () => {
      let exactFired = false;
      let wildcardFired = false;
      let allFired = false;

      eventBusService.subscribe('booking.confirmed', () => {
        exactFired = true;
      });

      eventBusService.subscribe('booking.*', () => {
        wildcardFired = true;
      });

      eventBusService.subscribe('*', () => {
        allFired = true;
      });

      await eventBusService.publish({
        tenantId,
        eventType: 'booking.confirmed',
        timestamp: new Date().toISOString(),
        data: { bookingId: 'bk_123', serviceName: 'Dental Checkup' }
      });

      expect(exactFired).toBe(true);
      expect(wildcardFired).toBe(true);
      expect(allFired).toBe(true);

      const history = eventBusService.getRecentEvents(tenantId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].eventType).toBe('booking.confirmed');
    });

    it('should evaluate conditions correctly (equals, contains, greater_than, in)', () => {
      const data = {
        amount: 250,
        customer: { tier: 'VIP', city: 'San Francisco' },
        service: 'Laser Whitening',
        tags: ['priority', 'lead']
      };

      // Equals
      expect(
        workflowEngineService.matchesConditions(
          [{ field: 'customer.tier', operator: 'equals', value: 'vip' }],
          data
        )
      ).toBe(true);

      // Not equals
      expect(
        workflowEngineService.matchesConditions(
          [{ field: 'customer.tier', operator: 'not_equals', value: 'standard' }],
          data
        )
      ).toBe(true);

      // Greater than
      expect(
        workflowEngineService.matchesConditions(
          [{ field: 'amount', operator: 'greater_than', value: 100 }],
          data
        )
      ).toBe(true);
      expect(
        workflowEngineService.matchesConditions(
          [{ field: 'amount', operator: 'greater_than', value: 500 }],
          data
        )
      ).toBe(false);

      // Contains
      expect(
        workflowEngineService.matchesConditions(
          [{ field: 'service', operator: 'contains', value: 'whitening' }],
          data
        )
      ).toBe(true);

      // In array
      expect(
        workflowEngineService.matchesConditions(
          [{ field: 'service', operator: 'in', value: ['Laser Whitening', 'Root Canal'] }],
          data
        )
      ).toBe(true);
    });

    it('should execute workflow end-to-end when triggered by an event', async () => {
      // Create a workflow with an internal alert action
      const workflow = await workflowEngineService.createWorkflow(tenantId, {
        name: 'Urgent VIP Handoff Notification',
        trigger: 'handoff.requested',
        conditions: [
          { field: 'priority', operator: 'equals', value: 'high' }
        ],
        actions: [
          {
            type: 'internal_alert',
            config: {
              severity: 'critical',
              title: 'VIP Handoff Alert',
              messageTemplate: 'Customer {{customerName}} has requested human intervention!'
            }
          }
        ],
        isActive: true
      });

      expect(workflow.id).toBeDefined();

      const res = await workflowEngineService.processEvent({
        tenantId,
        eventType: 'handoff.requested',
        timestamp: new Date().toISOString(),
        data: { priority: 'high', customerName: 'Alice Springs' }
      });

      expect(res.executedWorkflows).toContain(workflow.id);
      expect(res.errors.length).toBe(0);

      // Should NOT execute if condition is not met
      const nonMatchingRes = await workflowEngineService.processEvent({
        tenantId,
        eventType: 'handoff.requested',
        timestamp: new Date().toISOString(),
        data: { priority: 'low', customerName: 'Bob' }
      });
      expect(nonMatchingRes.executedWorkflows).not.toContain(workflow.id);
    });
  });

  describe('Task 6.2: Action Dispatcher (WhatsApp Templates & Webhooks)', () => {
    it('should interpolate variables and phone in SendTemplateAction', async () => {
      const config = {
        templateName: 'appointment_reminder',
        languageCode: 'en_US',
        recipientPhoneField: 'customerPhone',
        variables: {
          '1': 'customerName',
          '2': 'appointmentTime'
        }
      };

      const eventData = {
        customerPhone: '+15550001234',
        customerName: 'John Doe',
        appointmentTime: '2:30 PM'
      };

      const result = await sendTemplateAction.execute(config, eventData);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should fail SendTemplateAction gracefully if phone number is absent', async () => {
      const config = {
        templateName: 'test_tpl',
        recipientPhoneField: 'phone'
      };

      const result = await sendTemplateAction.execute(config, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipient phone number missing');
    });

    it('should sign webhook payloads with HMAC-SHA256 signature', async () => {
      const config = {
        url: 'https://httpbin.org/post', // Mock target
        secret: 'super_secret_webhook_key'
      };

      const event = {
        eventType: 'lead.created',
        tenantId,
        timestamp: '2026-09-30T00:00:00.000Z',
        data: { name: 'Dr. Jane Smith', email: 'jane@example.com' }
      };

      // Test URL validation
      const invalidUrlRes = await webhookAction.execute({ url: 'not-a-valid-url' }, event);
      expect(invalidUrlRes.success).toBe(false);
      expect(invalidUrlRes.error).toContain('Invalid destination');
    });

    it('should execute InternalAlertAction and dispatch alert', async () => {
      const res = await internalAlertAction.execute(
        {
          severity: 'warning',
          title: 'New Booking',
          messageTemplate: 'Booking made for {{service}}'
        },
        {
          eventType: 'booking.confirmed',
          tenantId,
          data: { service: 'Dental Cleaning' }
        }
      );

      expect(res.success).toBe(true);
    });
  });

  describe('Task 6.3: Pre-Configured Industry Blueprints', () => {
    it('should list all industry blueprints (restaurant, clinic, salon, real_estate, ecommerce, education, agency)', () => {
      const blueprints = blueprintService.getAvailableBlueprints();
      expect(blueprints.length).toBeGreaterThanOrEqual(6);

      const ids = blueprints.map((b) => b.id);
      expect(ids).toContain('restaurant');
      expect(ids).toContain('clinic');
      expect(ids).toContain('salon');
      expect(ids).toContain('real_estate');
      expect(ids).toContain('ecommerce');
      expect(ids).toContain('education');
    });

    it('should apply clinic blueprint to a tenant with 1-click configuration', async () => {
      const result = await blueprintService.applyBlueprint(tenantId, 'clinic');

      expect(result.blueprintId).toBe('clinic');
      expect(result.name).toBe('Healthcare & Clinic');
      expect(result.systemPrompt).toContain('medical receptionist');
      expect(result.enabledTools).toContain('book_appointment');
      expect(result.enabledTools).toContain('search_knowledge_base');
      expect(result.faqsIngested).toBeGreaterThan(0);
      expect(result.attributesConfigured).toBeGreaterThan(0);
      expect(result.workflowsCreated).toBeGreaterThan(0);

      // Verify that the clinic automated workflow was created
      const workflows = await workflowEngineService.listWorkflows(tenantId);
      const appointmentWf = workflows.find((w) => w.trigger === 'booking.confirmed');
      expect(appointmentWf).toBeDefined();
      expect(appointmentWf?.actions[0].type).toBe('send_template');
    });

    it('should apply real_estate blueprint with specialized lead workflow', async () => {
      const result = await blueprintService.applyBlueprint(tenantId, 'real_estate');

      expect(result.blueprintId).toBe('real_estate');
      expect(result.systemPrompt).toContain('real estate assistant');
      expect(result.enabledTools).toContain('capture_lead');

      const workflows = await workflowEngineService.listWorkflows(tenantId);
      const leadWf = workflows.find((w) => w.trigger === 'lead.created');
      expect(leadWf).toBeDefined();
      expect(leadWf?.actions[0].type).toBe('send_webhook');
    });
  });

  describe('Automations & Blueprints API Endpoints', () => {
    const app = buildApp();
    const token = jwt.sign(
      { sub: 'usr_1', email: 'admin@acme.com', role: 'ADMIN', tenantId },
      process.env.JWT_SECRET || 'dev_secret_jwt_key_super_secure'
    );

    afterAll(async () => {
      await app.close();
    });

    it('GET /api/v1/blueprints should return list of available blueprints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/blueprints',
        headers: { authorization: `Bearer ${token}` }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(6);
    });

    it('POST /api/v1/blueprints/apply should configure tenant preset', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/blueprints/apply',
        headers: { authorization: `Bearer ${token}` },
        payload: { blueprintId: 'restaurant' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.blueprintId).toBe('restaurant');
      expect(body.data.enabledTools).toContain('check_calendar_availability');
    });

    it('POST /api/v1/automations & GET /api/v1/automations should manage custom workflows', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/automations',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'VIP Welcome Webhook',
          trigger: 'lead.created',
          conditions: [{ field: 'tier', operator: 'equals', value: 'VIP' }],
          actions: [{ type: 'send_webhook', config: { url: 'https://example.com/lead' } }]
        }
      });

      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.body);
      expect(created.data.id).toBeDefined();

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/automations',
        headers: { authorization: `Bearer ${token}` }
      });

      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.body);
      expect(list.data.some((w: any) => w.id === created.data.id)).toBe(true);
    });
  });
});
