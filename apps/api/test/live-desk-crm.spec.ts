import { conversationStateService } from '../src/modules/conversations/conversation-state.service';
import { copilotService } from '../src/modules/ai/copilot.service';
import { contactsService } from '../src/modules/crm/contacts.service';
import { pipelineService } from '../src/modules/crm/pipeline.service';
import { LiveDeskGatewayHub } from '../src/gateways/live-desk.gateway';

describe('Phase 5: Live Human Desk & Mini-CRM Tests', () => {
  describe('Conversation State Machine', () => {
    it('executes valid state transition from BOT_ACTIVE to HANDOFF_QUEUED', async () => {
      const res = await conversationStateService.transitionState('conv-101', 'HANDOFF_QUEUED', {
        reason: 'Customer requested live assistance',
      });

      expect(res.status).toBe('HANDOFF_QUEUED');
    });

    it('assigns agent during takeover transition to AGENT_ACTIVE', async () => {
      const res = await conversationStateService.transitionState('conv-101', 'AGENT_ACTIVE', {
        agentUserId: 'agent-uuid-777',
      });

      expect(res.status).toBe('AGENT_ACTIVE');
      expect(res.assignedToUserId).toBe('agent-uuid-777');
    });

    it('records an internal team note in the conversation thread', async () => {
      const note = await conversationStateService.addInternalNote(
        'mock-tenant',
        'conv-101',
        'agent-uuid-777',
        'Customer was verified via billing phone; priority VIP status.'
      );

      expect(note).toHaveProperty('id');
      expect((note as any).isInternalNote || (note as any).content?.isInternalNote).toBe(true);
    });
  });

  describe('AI Copilot for Live Agents', () => {
    it('generates thread summary and detects customer sentiment', async () => {
      const summary = await copilotService.summarizeThread('conv-101');
      expect(summary).toHaveProperty('summary');
      expect(summary).toHaveProperty('sentiment');
      expect(summary).toHaveProperty('intent');
    });

    it('suggests friendly and formal quick replies', async () => {
      const friendly = await copilotService.suggestReply('conv-101', 'friendly');
      expect(friendly.suggestedText.length).toBeGreaterThan(0);
      expect(friendly.tone).toBe('friendly');

      const formal = await copilotService.suggestReply('conv-101', 'formal');
      expect(formal.suggestedText).toContain('Good day');
      expect(formal.tone).toBe('formal');
    });
  });

  describe('Mini-CRM & Interaction Timeline', () => {
    it('updates contact tags and custom attributes', async () => {
      const updated = await contactsService.updateContact('contact-901', {
        name: 'Sarah Connor',
        tags: ['VIP', 'High-Intent'],
        customAttributes: { preferredSeating: 'Patio', partySize: 4 },
      });

      expect(updated.name).toBe('Sarah Connor');
      expect(updated.tags).toContain('VIP');
    });

    it('retrieves chronological timeline array', async () => {
      const timeline = await contactsService.getContactTimeline('contact-901');
      expect(Array.isArray(timeline)).toBe(true);
    });
  });

  describe('Kanban Lead Pipeline Board', () => {
    it('retrieves pipeline board organized into standard stages', async () => {
      const board = await pipelineService.getPipelineBoard('mock-tenant');
      expect(board.length).toBe(5);
      expect(board.map((c) => c.id)).toEqual([
        'lead',
        'qualified',
        'appointment_booked',
        'customer',
        'closed',
      ]);
    });

    it('moves contact across pipeline stages', async () => {
      const res = await pipelineService.moveContactStage('contact-901', 'qualified');
      expect(res.stage).toBe('qualified');
    });
  });

  describe('Live Desk Gateway Hub', () => {
    it('broadcasts to rooms without error when empty', () => {
      expect(() => {
        LiveDeskGatewayHub.broadcastToRoom('conv-101', 'message:new', { text: 'Hello' });
        LiveDeskGatewayHub.notifyAllAgents('ticket:escalated', { conversationId: 'conv-101' });
      }).not.toThrow();
    });
  });
});
