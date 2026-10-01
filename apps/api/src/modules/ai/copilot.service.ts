import { conversationHistoryService } from './conversation-history.service';
import { llmProviderService } from './llm-provider.service';

export interface CopilotSummary {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'frustrated';
  intent: string;
}

export interface CopilotReplySuggestion {
  suggestedText: string;
  tone: string;
  quickOptions: string[];
}

export class CopilotService {
  /**
   * Summarizes a customer thread for the human agent taking over.
   */
  async summarizeThread(conversationId: string): Promise<CopilotSummary> {
    const history = await conversationHistoryService.buildChatHistory(conversationId, 10);
    const textCorpus = history.map((h) => `${h.role}: ${h.content}`).join('\n');

    let sentiment: CopilotSummary['sentiment'] = 'neutral';
    if (
      textCorpus.toLowerCase().includes('frustrated') ||
      textCorpus.toLowerCase().includes('terrible') ||
      textCorpus.toLowerCase().includes('cancel')
    ) {
      sentiment = 'frustrated';
    } else if (textCorpus.toLowerCase().includes('thank') || textCorpus.toLowerCase().includes('great')) {
      sentiment = 'positive';
    }

    const lastMsg = history[history.length - 1]?.content || 'None';

    return {
      summary: `Customer inquired about service options and requested live assistance. Most recent message: "${lastMsg}"`,
      sentiment,
      intent: 'Customer Support Escalation',
    };
  }

  /**
   * Generates AI-suggested quick replies for the live agent.
   */
  async suggestReply(conversationId: string, tone: 'friendly' | 'formal' = 'friendly'): Promise<CopilotReplySuggestion> {
    const history = await conversationHistoryService.buildChatHistory(conversationId, 4);

    const suggestions =
      tone === 'formal'
        ? [
            'Good day. Thank you for your patience; I would be pleased to assist you with this matter.',
            'Certainly, allow me to look into your account details and provide an update momentarily.',
          ]
        : [
            'Hi there! Thanks for waiting, I am happy to help you with this right away 😊',
            'Got it! Let me check the details for you right now.',
          ];

    return {
      suggestedText: suggestions[0],
      tone,
      quickOptions: suggestions,
    };
  }
}

export const copilotService = new CopilotService();
