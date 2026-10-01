import { prisma } from '@saas/database';
import { InboundMessagePayload, OutboundMessagePayload } from '@saas/shared-types';
import { sessionLockService } from './session-lock.service';
import { conversationHistoryService } from './conversation-history.service';
import { guardrailsService } from './guardrails.service';
import { toolRegistry } from './tool-registry';
import { outboundDispatcher } from '../channels/outbound.dispatcher';
import { llmProviderService } from './llm-provider.service';

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

      // 7. Run ReAct Autonomous Loop with Real LLM Provider / Fallback
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
   * Delegates to LLM provider (OpenAI, Gemini, Groq) with zero-downtime offline fallback.
   */
  async runReActLoop(params: {
    systemPrompt: string;
    userMessage: string;
    history: Array<{ role: string; content: string }>;
    context: { tenantId: string; conversationId: string; contactId?: string };
  }): Promise<string> {
    return llmProviderService.generateToolCallingResponse({
      systemPrompt: params.systemPrompt,
      userMessage: params.userMessage,
      history: params.history,
      context: params.context,
      maxSteps: this.maxReActSteps,
    });
  }
}

export const agentOrchestrator = new AgentOrchestrator();
