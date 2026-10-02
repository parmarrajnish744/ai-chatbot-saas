const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
  }
  return 'http://localhost:4000/api/v1';
};

const API_BASE = getApiBase();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { message: string };
  message?: string;
}

class ApiClient {
  private tenantId: string = 'tenant-demo-prod';

  setTenantId(id: string) {
    this.tenantId = id;
  }

  getTenantId() {
    return this.tenantId;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.tenantId,
      ...(options.headers as any),
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: { message: err.message || 'Network request failed' },
      };
    }
  }

  // Analytics
  async getAnalyticsSummary() {
    return this.request<{
      activeConversations: number;
      botDeflectionRate: number;
      humanEscalations: number;
      totalMessagesThisMonth: number;
      messagesQuota: number;
      costSavings: number;
      recentEvents: Array<{ id: string; type: string; channel: string; timestamp: string; preview: string }>;
    }>('/analytics/summary');
  }

  // Live Human Desk
  async getConversations(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<any[]>(`/conversations${q}`);
  }

  async getConversationMessages(id: string) {
    return this.request<any[]>(`/conversations/${id}/messages`);
  }

  async takeoverConversation(id: string, agentUserId: string = 'agent-admin') {
    return this.request(`/conversations/${id}/takeover`, {
      method: 'POST',
      body: JSON.stringify({ agentUserId }),
    });
  }

  async resolveConversation(id: string) {
    return this.request(`/conversations/${id}/resolve`, {
      method: 'POST',
    });
  }

  async sendAgentMessage(conversationId: string, text: string) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, senderType: 'AGENT' }),
    });
  }

  async addInternalNote(conversationId: string, noteText: string) {
    return this.request(`/conversations/${conversationId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ noteText, authorUserId: 'agent-admin' }),
    });
  }

  // AI Copilot
  async getCopilotSummary(conversationId: string) {
    return this.request<{
      summary: string;
      sentiment: 'positive' | 'neutral' | 'frustrated';
      intent: string;
    }>(`/conversations/${conversationId}/copilot/summary`);
  }

  async getCopilotSuggestedReply(conversationId: string, tone: 'friendly' | 'formal' = 'friendly') {
    return this.request<{
      suggestedText: string;
      tone: string;
      quickOptions: string[];
    }>(`/conversations/${conversationId}/copilot/suggest?tone=${tone}`);
  }

  // Knowledge Base RAG
  async getKnowledgeDocuments() {
    return this.request<Array<{ id: string; title: string; chunkCount: number; createdAt: string }>>('/knowledge/documents');
  }

  async uploadKnowledgeDocument(payload: { title: string; content: string; chunkSize?: number; overlap?: number }) {
    return this.request<{ id: string; title: string; chunkCount: number; createdAt: string }>('/knowledge/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async searchKnowledge(query: string, topK: number = 3) {
    return this.request<{
      query: string;
      results: Array<{ id: string; content: string; score: number }>;
    }>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, topK }),
    });
  }

  async deleteKnowledgeDocument(id: string) {
    return this.request(`/knowledge/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // CRM Pipeline
  async getPipelineBoard() {
    return this.request<Array<{
      id: string;
      name: string;
      count: number;
      contacts: Array<{
        id: string;
        name: string;
        phone?: string;
        email?: string;
        stage: string;
        customAttributes?: any;
        updatedAt: string;
      }>;
    }>>('/crm/pipeline');
  }

  async moveContactStage(contactId: string, stage: string) {
    return this.request(`/crm/pipeline/move`, {
      method: 'POST',
      body: JSON.stringify({ contactId, stage }),
    });
  }

  // Billing
  async getBillingStatus() {
    return this.request<{
      tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
      status: string;
      messagesUsed: number;
      messagesLimit: number;
      billingPeriodEnd: string;
    }>('/billing/status');
  }

  async createCheckout(planId: string) {
    return this.request<{ checkoutUrl: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  // Blueprints
  async applyBlueprint(presetKey: string) {
    return this.request(`/blueprints/apply`, {
      method: 'POST',
      body: JSON.stringify({ presetKey }),
    });
  }
}

export const apiClient = new ApiClient();
