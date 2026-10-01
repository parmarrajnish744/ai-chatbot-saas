import { getOpenAIToolsDefinition, toolRegistry } from '../src/modules/ai/tool-registry';
import { llmProviderService } from '../src/modules/ai/llm-provider.service';
import { agentOrchestrator } from '../src/modules/ai/agent.orchestrator';
import { buildApp } from '../src/app';

describe('Autonomous LLM Tool Calling & Knowledge Base Integration', () => {
  describe('OpenAI Tools Definition Generator', () => {
    it('generates compliant OpenAI function definitions for all registered tools', () => {
      const tools = getOpenAIToolsDefinition();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThanOrEqual(7);

      const toolNames = tools.map((t) => t.function.name);
      expect(toolNames).toContain('search_knowledge_base');
      expect(toolNames).toContain('search_products');
      expect(toolNames).toContain('check_order_status');
      expect(toolNames).toContain('check_calendar_availability');
      expect(toolNames).toContain('book_appointment');
      expect(toolNames).toContain('capture_lead');
      expect(toolNames).toContain('transfer_to_human');

      // Check schema specifications
      for (const t of tools) {
        expect(t.type).toBe('function');
        expect(t.function.name).toBeTruthy();
        expect(t.function.description).toBeTruthy();
        expect(t.function.parameters.type).toBe('object');
      }
    });

    it('ToolRegistry exposes getToolsDefinition()', () => {
      const defs = toolRegistry.getToolsDefinition();
      expect(defs.length).toBe(7);
    });
  });

  describe('Autonomous ReAct Loop & Fallback', () => {
    jest.setTimeout(35000);

    const dummyContext = {
      tenantId: 'tenant-test-llm',
      conversationId: 'conv-test-llm',
      contactId: 'contact-test-llm',
    };

    it('executes product search in ReAct loop', async () => {
      const reply = await agentOrchestrator.runReActLoop({
        systemPrompt: 'You are a retail store assistant.',
        userMessage: 'Show me your coffee menu and prices please',
        history: [],
        context: dummyContext,
      });

      const lower = reply.toLowerCase();
      expect(lower.includes('popular items') || lower.includes('coffee') || lower.includes('blend')).toBe(true);
    }, 35000);

    it('executes appointment availability in ReAct loop', async () => {
      const reply = await agentOrchestrator.runReActLoop({
        systemPrompt: 'You are a clinic assistant.',
        userMessage: 'I need to book an appointment for tomorrow',
        history: [],
        context: dummyContext,
      });

      const lower = reply.toLowerCase();
      expect(lower.includes('open slots') || lower.includes('slot') || lower.includes('appointment')).toBe(true);
    }, 35000);

    it('executes human transfer escalation in ReAct loop', async () => {
      const reply = await agentOrchestrator.runReActLoop({
        systemPrompt: 'You are a customer assistant.',
        userMessage: 'I want to speak with a human agent right now',
        history: [],
        context: dummyContext,
      });

      const lower = reply.toLowerCase();
      expect(lower.includes('team') || lower.includes('human') || lower.includes('representative') || lower.includes('forwarded')).toBe(true);
    }, 35000);

    it('executes order tracking in ReAct loop', async () => {
      const reply = await agentOrchestrator.runReActLoop({
        systemPrompt: 'You are an ecommerce assistant.',
        userMessage: 'Can you check order tracking for 1001?',
        history: [],
        context: dummyContext,
      });

      const lower = reply.toLowerCase();
      expect(lower.includes('1001') || lower.includes('order')).toBe(true);
    }, 35000);
  });

  describe('Knowledge Base REST Endpoints', () => {
    const app = buildApp();

    afterAll(async () => {
      await app.close();
    });

    it('POST /api/v1/knowledge/upload chunks and indexes new document', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/knowledge/upload',
        headers: {
          'x-tenant-id': 'tenant-test-kb',
        },
        payload: {
          title: 'Return and Exchange Policy',
          content: 'Customers can return items within 30 days of purchase for a full refund or store exchange. Items must be in original unworn condition with tags attached. Proof of purchase is required.',
          chunkSize: 100,
          overlap: 20,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Return and Exchange Policy');
      expect(body.data.chunkCount).toBeGreaterThan(0);
    });

    it('GET /api/v1/knowledge/documents lists tenant knowledge documents', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/knowledge/documents',
        headers: {
          'x-tenant-id': 'tenant-test-kb',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/knowledge/search retrieves matching chunks', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/knowledge/search',
        headers: {
          'x-tenant-id': 'tenant-test-kb',
        },
        payload: {
          query: 'What is your refund timeframe?',
          topK: 2,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.query).toBe('What is your refund timeframe?');
      expect(Array.isArray(body.data.results)).toBe(true);
    });
  });
});
