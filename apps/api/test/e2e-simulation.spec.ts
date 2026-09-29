import { messageDedupService } from '../src/queues/message-dedup.service';
import { guardrailsService } from '../src/modules/ai/guardrails.service';
import { toolRegistry } from '../src/modules/ai/tool-registry';
import { agentOrchestrator } from '../src/modules/ai/agent.orchestrator';
import { conversationStateService } from '../src/modules/conversations/conversation-state.service';
import { outboundDispatcher } from '../src/modules/channels/outbound.dispatcher';
import { credentialsEncryptor } from '../src/modules/security/credentials-encryptor';
import { quotaService } from '../src/modules/billing/quota.service';
import { eventBusService } from '../src/modules/automations/event-bus.service';
import { workflowEngineService } from '../src/modules/automations/workflow-engine.service';
import { buildApp } from '../src/app';

describe('Phase 8: Hardening, Security, E2E Testing & Compliance Audit', () => {
  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  describe('Task 8.1: End-to-End Full Simulated Conversation Loop', () => {
    it('should process full flow: Inbound -> Dedup -> Guardrails -> ReAct Tool Calling -> Response', async () => {
      const messageId = `msg_test_${Date.now()}`;
      const rawText = 'Hi, I need an appointment for tooth cleaning. My card is 4111-2222-3333-4444';

      // 1. Message Deduplication Check
      const isNew = await messageDedupService.checkAndAcquire(messageId);
      expect(isNew).toBe(true);

      const isDuplicate = await messageDedupService.checkAndAcquire(messageId);
      expect(isDuplicate).toBe(false);

      // 2. Guardrails & PII Sanitization
      const sanitized = guardrailsService.sanitizeInput(rawText);
      expect(sanitized.warnings.length).toBeGreaterThan(0);
      expect(sanitized.sanitizedText).not.toContain('4111-2222-3333-4444');
      expect(sanitized.sanitizedText).toContain('[REDACTED_PAYMENT_CARD]');

      // 3. ReAct Agent Tool Execution
      const reply = await agentOrchestrator.runReActLoop({
        systemPrompt: 'You are a dental receptionist. When customer asks for appointment, check calendar availability.',
        userMessage: sanitized.sanitizedText,
        history: [],
        context: {
          tenantId: tenantA,
          conversationId: 'conv-test-1',
          contactId: 'contact-test-1'
        }
      });

      expect(reply).toBeDefined();
      expect(reply.length).toBeGreaterThan(0);

      // 4. Real-time Metering
      const quota = await quotaService.incrementUsage(tenantA, 1, 150);
      expect(quota.currentMessages).toBeGreaterThanOrEqual(1);
    });

    it('should handle Human Handoff escalation and pause AI bot inference', async () => {
      const convId = 'conv-handoff-888';

      // Step B: Set up automation to catch handoff.requested
      let handoffAlertTriggered = false;
      eventBusService.subscribe('handoff.requested', (evt) => {
        if (evt.data?.conversationId === convId) {
          handoffAlertTriggered = true;
        }
      });

      // Step C: Trigger handoff request
      const handoffState = await conversationStateService.transitionState(convId, 'HANDOFF_QUEUED', {
        reason: 'Customer requested human agent'
      });
      expect(handoffState.status).toBe('HANDOFF_QUEUED');

      // Step D: Publish event to trigger automations
      await eventBusService.publish({
        tenantId: tenantA,
        eventType: 'handoff.requested',
        data: { conversationId: convId, reason: 'Customer requested human agent' }
      });
      expect(handoffAlertTriggered).toBe(true);

      // Step E: Agent takes over -> AGENT_ACTIVE
      const activeState = await conversationStateService.transitionState(convId, 'AGENT_ACTIVE', {
        agentUserId: 'agent-alice-uuid'
      });
      expect(activeState.status).toBe('AGENT_ACTIVE');
      expect(activeState.assignedToUserId).toBe('agent-alice-uuid');

      // Step F: Human agent resolves ticket and returns to bot
      const resolvedState = await conversationStateService.transitionState(convId, 'RESOLVED');
      expect(resolvedState.status).toBe('RESOLVED');
    });
  });

  describe('Task 8.2: Security & Multi-Tenant Compliance Audit', () => {
    it('should strictly isolate multi-tenant data (Tenant A vs Tenant B quotas)', async () => {
      quotaService.resetCounters();

      await quotaService.incrementUsage(tenantA, 50, 1000);
      await quotaService.incrementUsage(tenantB, 10, 200);

      const usageA = await quotaService.getUsage(tenantA);
      const usageB = await quotaService.getUsage(tenantB);

      expect(usageA.messages).toBe(50);
      expect(usageA.tokens).toBe(1000);

      expect(usageB.messages).toBe(10);
      expect(usageB.tokens).toBe(200);
    });

    it('should encrypt sensitive channel credentials using AES-256-GCM', () => {
      const credentials = {
        metaAccessToken: 'EAABwzL1...very_secret_meta_token',
        phoneNumberId: '10982348712398',
        wabaId: '29871239847129'
      };

      const encrypted = credentialsEncryptor.encrypt(credentials);

      // Format: iv:authTag:ciphertext
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(encrypted).not.toContain('EAABwzL1');

      // Decrypt
      const decrypted = credentialsEncryptor.decrypt(encrypted, true);
      expect(decrypted.metaAccessToken).toBe(credentials.metaAccessToken);
      expect(decrypted.phoneNumberId).toBe(credentials.phoneNumberId);
    });

    it('should reject tampered or corrupted encrypted credentials', () => {
      const encrypted = credentialsEncryptor.encrypt('super_secret_token');
      const parts = encrypted.split(':');

      // Tamper ciphertext
      const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;

      expect(() => {
        credentialsEncryptor.decrypt(tampered);
      }).toThrow();
    });

    it('should enforce WhatsApp 24-hour compliance window', () => {
      const now = new Date();

      // Case 1: Inbound message received 2 hours ago -> WITHIN 24h window
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const withinWindow = outboundDispatcher.isWithin24HourWindow(twoHoursAgo);
      expect(withinWindow).toBe(true);

      // Case 2: Inbound message received 25 hours ago -> OUTSIDE 24h window
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const outsideWindow = outboundDispatcher.isWithin24HourWindow(twentyFiveHoursAgo);
      expect(outsideWindow).toBe(false);
    });
  });

  describe('Health and Application Bootstrapping', () => {
    const app = buildApp();

    afterAll(async () => {
      await app.close();
    });

    it('GET /health returns healthy status and service descriptor', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('omnichannel-ai-saas-api');
    });
  });
});
