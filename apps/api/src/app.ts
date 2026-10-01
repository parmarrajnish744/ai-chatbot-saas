import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { tenantContextMiddleware } from './middlewares/tenant-context.middleware';
import { authRoutes } from './modules/auth/auth.controller';
import { whatsAppRoutes } from './modules/channels/whatsapp/whatsapp.controller';
import { webchatGateway } from './gateways/webchat.gateway';
import { mockRoutes } from './modules/mock/mock.controller';
import { wooCommerceRoutes } from './modules/integrations/woocommerce/woocommerce.controller';
import { conversationRoutes } from './modules/conversations/conversations.controller';
import { crmRoutes } from './modules/crm/contacts.controller';
import { automationsRoutes } from './modules/automations/automations.controller';
import { billingRoutes } from './modules/billing/billing.controller';
import { analyticsRoutes } from './modules/analytics/analytics.controller';
import { knowledgeRoutes } from './modules/knowledge/knowledge.controller';
import { liveDeskGateway } from './gateways/live-desk.gateway';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Register plugins
  app.register(cors, {
    origin: true,
    credentials: true,
  });
  app.register(websocket);

  // Global tenant extractor hook
  app.addHook('preHandler', tenantContextMiddleware);

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'omnichannel-ai-saas-api',
    };
  });

  // API v1 Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(whatsAppRoutes, { prefix: '/api/v1/channels/whatsapp' });
  app.register(mockRoutes, { prefix: '/api/v1/mock' });
  app.register(wooCommerceRoutes, { prefix: '/api/v1/integrations/woocommerce' });
  app.register(conversationRoutes, { prefix: '/api/v1/conversations' });
  app.register(crmRoutes, { prefix: '/api/v1/crm' });
  app.register(automationsRoutes, { prefix: '/api/v1' });
  app.register(billingRoutes, { prefix: '/api/v1/billing' });
  app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  app.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });

  // Real-time WebSockets
  app.register(webchatGateway);
  app.register(liveDeskGateway);

  return app;
}
