import { toolRegistry, getOpenAIToolsDefinition } from './tool-registry';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ReActTurnContext {
  tenantId: string;
  conversationId: string;
  contactId?: string;
}

export interface ReActLoopParams {
  systemPrompt: string;
  userMessage: string;
  history: Array<{ role: string; content: string }>;
  context: ReActTurnContext;
  maxSteps?: number;
}

export class LLMProviderService {
  private maxSteps = 5;

  /**
   * Resolves configuration for OpenAI / Gemini / Groq / OpenAI-compatible endpoint.
   */
  private getProviderConfig() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const genericKey = process.env.LLM_API_KEY;

    if (openaiKey) {
      return {
        apiKey: openaiKey,
        baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      };
    }

    if (geminiKey) {
      return {
        apiKey: geminiKey,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      };
    }

    if (groqKey) {
      return {
        apiKey: groqKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      };
    }

    if (genericKey) {
      return {
        apiKey: genericKey,
        baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      };
    }

    return null;
  }

  /**
   * Checks whether a live LLM provider is configured with credentials.
   */
  isConfigured(): boolean {
    return this.getProviderConfig() !== null;
  }

  /**
   * Executes autonomous ReAct tool-calling loop using standard OpenAI-compatible API.
   * If credentials are not set or provider call fails, gracefully falls back to deterministic matcher.
   */
  async generateToolCallingResponse(params: ReActLoopParams): Promise<string> {
    const config = this.getProviderConfig();

    if (!config) {
      return this.fallbackDeterministicReAct(params);
    }

    try {
      const tools = getOpenAIToolsDefinition();
      const messages: LLMMessage[] = [
        { role: 'system', content: params.systemPrompt },
        ...params.history.map((h) => ({
          role: (h.role === 'assistant' || h.role === 'bot' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: h.content,
        })),
        { role: 'user', content: params.userMessage },
      ];

      const stepsLimit = params.maxSteps || this.maxSteps;

      for (let step = 0; step < stepsLimit; step++) {
        const response = await this.callChatCompletion(config, messages, tools);

        if (!response || !response.choices || response.choices.length === 0) {
          break;
        }

        const choice = response.choices[0];
        const assistantMsg = choice.message;

        // If the model invoked tools:
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
          messages.push(assistantMsg);

          for (const call of assistantMsg.tool_calls) {
            const toolName = call.function.name;
            let toolArgs: any = {};
            try {
              toolArgs = JSON.parse(call.function.arguments || '{}');
            } catch (err) {
              toolArgs = {};
            }

            let toolResult: any;
            try {
              toolResult = await toolRegistry.executeTool(toolName, toolArgs, params.context);
            } catch (toolErr: any) {
              toolResult = { error: toolErr.message || 'Tool execution failed' };
            }

            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              name: toolName,
              content: JSON.stringify(toolResult),
            });
          }

          // Continue loop to give model the tool results for final answer
          continue;
        }

        // Final text answer received from model
        if (assistantMsg.content) {
          return assistantMsg.content;
        }

        break;
      }

      // If loop finished with tool outputs but no final text, synthesize with fallback
      return this.fallbackDeterministicReAct(params);
    } catch (err) {
      // Graceful fallback on network/rate-limit error
      return this.fallbackDeterministicReAct(params);
    }
  }

  /**
   * Helper to make HTTP POST to OpenAI-compatible chat completion endpoint.
   */
  private async callChatCompletion(
    config: { apiKey: string; baseUrl: string; model: string },
    messages: LLMMessage[],
    tools: any[]
  ): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`LLM provider HTTP ${res.status}: ${await res.text()}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Offline deterministic pattern matcher for zero-downtime local testing.
   */
  async fallbackDeterministicReAct(params: ReActLoopParams): Promise<string> {
    const { userMessage, context } = params;
    const lower = userMessage.toLowerCase();

    if (lower.includes('menu') || lower.includes('product') || lower.includes('price')) {
      const toolRes = await toolRegistry.executeTool('search_products', { searchTerm: 'all' }, context);
      if (toolRes.products && toolRes.products.length > 0) {
        return (
          `Here are some of our popular items:\n` +
          toolRes.products.map((p: any) => `• ${p.name} — ${p.price}`).join('\n') +
          `\nWould you like more details or help ordering?`
        );
      }
    }

    if (
      lower.includes('book') ||
      lower.includes('appointment') ||
      lower.includes('reserve') ||
      lower.includes('table')
    ) {
      const toolRes = await toolRegistry.executeTool(
        'check_calendar_availability',
        { date: '2026-10-02' },
        context
      );
      return `We have open slots available on ${toolRes.date}: ${toolRes.availableSlots.join(', ')}. What time works best for you?`;
    }

    if (
      lower.includes('human') ||
      lower.includes('agent') ||
      lower.includes('speak to someone') ||
      lower.includes('operator')
    ) {
      await toolRegistry.executeTool(
        'transfer_to_human',
        { reason: 'Customer requested human support', urgency: 'medium' },
        context
      );
      return 'I have forwarded your request to our team. A team member will join this conversation shortly!';
    }

    if (lower.includes('order') || lower.includes('tracking') || lower.includes('shipment')) {
      const toolRes = await toolRegistry.executeTool('check_order_status', { orderNumber: '1001' }, context);
      return `Order #${toolRes.orderNumber} is currently ${toolRes.status}. Estimated delivery: ${toolRes.estimatedDelivery} via ${toolRes.carrier}.`;
    }

    return `Thank you for contacting us! I am here to help you with our services, reservations, product catalog, and order tracking. How can I assist you today?`;
  }
}

export const llmProviderService = new LLMProviderService();
