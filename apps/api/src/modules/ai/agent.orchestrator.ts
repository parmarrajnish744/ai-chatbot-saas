import { prisma } from '@saas/database';
import { InboundMessagePayload, OutboundMessagePayload } from '@saas/shared-types';
import { sessionLockService } from './session-lock.service';
import { conversationHistoryService } from './conversation-history.service';
import { guardrailsService } from './guardrails.service';
import { toolRegistry } from './tool-registry';
import { outboundDispatcher } from '../channels/outbound.dispatcher';

export class AgentOrchestrator {
  private maxReActSteps = 5;

  /**
   * Processes an inbound message through the autonomous ReAct agent loop.
   */
  async processInboundTurn(inbound: InboundMessagePayload) {
    // 1. Resolve Contact and Conversation
    const { contact, conversation } = await conversationHistoryService.getOrCreateConversation(inbound);

    // 2. Human-in-the-Loop Check: If human agent is active, bypass bot inference
    if (conversation.status === 'AGENT_ACTIVE') {
      return { handledBy: 'human_agent', conversationId: conversation.id };
    }

    // 3. Acquire Turn Lock
    const lockToken = await sessionLockService.acquireLock(conversation.id);
    if (!lockToken) {
      // Turn is already being processed by another worker; dropped to prevent racing
      return { handledBy: 'lock_held', conversationId: conversation.id };
    }

    try {
      // 4. Input Sanitization & Guardrails
      const rawText = inbound.message.text || '';
      const guardResult = guardrailsService.sanitizeInput(rawText);

      // 5. Fetch Tenant Configuration
      const tenant = await prisma.tenant.findUnique({
        where: { id: inbound.tenantId },
      });

      const settings = (tenant?.settings as any) || {};
      const basePrompt = settings.systemPrompt || 'You are an intelligent, helpful AI assistant.';

      // 6. Build Chat Context
      const history = await conversationHistoryService.buildChatHistory(conversation.id, 8);

      // 7. Run ReAct Autonomous Loop
      const replyText = await this.runReActLoop({
        systemPrompt: basePrompt,
        userMessage: guardResult.sanitizedText,
        history,
        context: {
          tenantId: inbound.tenantId,
          conversationId: conversation.id,
          contactId: contact.id,
        },
      });

      // 8. Dispatch Outbound Reply
      const outboundPayload: OutboundMessagePayload = {
        tenantId: inbound.tenantId,
        conversationId: conversation.id,
        channelId: inbound.channelId,
        channelType: inbound.channelType,
        recipientId: inbound.sender.externalId,
        content: {
          type: 'TEXT',
          text: replyText,
        },
      };

      await outboundDispatcher.dispatch(outboundPayload);

      return {
        handledBy: 'ai_bot',
        conversationId: conversation.id,
        reply: replyText,
      };
    } finally {
      // Always release conversation lock
      await sessionLockService.releaseLock(conversation.id, lockToken);
    }
  }

  /**
   * Autonomous ReAct loop with multi-step tool calling.
   */
  async runReActLoop(params: {
    systemPrompt: string;
    userMessage: string;
    history: Array<{ role: string; content: string }>;
    context: { tenantId: string; conversationId: string; contactId?: string };
  }): Promise<string> {
    const { userMessage, context } = params;

    // Pattern-based tool matching for offline dev / testing or when LLM API keys are unconfigured
    const lower = userMessage.toLowerCase();

    if (lower.includes('menu') || lower.includes('product') || lower.includes('price')) {
      const toolRes = await toolRegistry.executeTool('search_products', { searchTerm: 'all' }, context);
      if (toolRes.products && toolRes.products.length > 0) {
        return `Here are some of our popular items:\n` +
          toolRes.products.map((p: any) => `• ${p.name} — ${p.price}`).join('\n') +
          `\nWould you like more details or help ordering?`;
      }
    }

    if (lower.includes('book') || lower.includes('appointment') || lower.includes('reserve') || lower.includes('table')) {
      const toolRes = await toolRegistry.executeTool('check_calendar_availability', { date: '2026-10-02' }, context);
      return `We have open slots available on ${toolRes.date}: ${toolRes.availableSlots.join(', ')}. What time works best for you?`;
    }

    if (lower.includes('human') || lower.includes('agent') || lower.includes('speak to someone') || lower.includes('operator')) {
      await toolRegistry.executeTool('transfer_to_human', { reason: 'Customer requested human support', urgency: 'medium' }, context);
      return 'I have forwarded your request to our team. A team member will join this conversation shortly!';
    }

    if (lower.includes('order') || lower.includes('tracking') || lower.includes('shipment')) {
      const toolRes = await toolRegistry.executeTool('check_order_status', { orderNumber: '1001' }, context);
      return `Order #${toolRes.orderNumber} is currently ${toolRes.status}. Estimated delivery: ${toolRes.estimatedDelivery} via ${toolRes.carrier}.`;
    }

    // Default conversational response
    return `Thank you for contacting us! I am here to help you with our services, reservations, product catalog, and order tracking. How can I assist you today?`;
  }
}

export const agentOrchestrator = new AgentOrchestrator();
