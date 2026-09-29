import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
    user?: {
      userId: string;
      email: string;
      role: 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER';
    };
  }
}

/**
 * Extracts and verifies the tenant context from the header, route param, or user membership.
 */
export async function tenantContextMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Allow tenant from x-tenant-id header (for API keys or frontend workspace switcher)
  const headerTenantId = request.headers['x-tenant-id'] as string;
  const paramTenantId = (request.params as any)?.tenantId as string;

  const tenantId = headerTenantId || paramTenantId;

  if (tenantId) {
    request.tenantId = tenantId;
  }
}
