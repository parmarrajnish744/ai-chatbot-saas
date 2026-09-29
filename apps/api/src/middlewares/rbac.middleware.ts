import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '@saas/database';
import { Role } from '@saas/shared-types';

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  AGENT: 2,
  VIEWER: 1,
};

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Ensures user is authenticated via Bearer JWT and extracts user identity.
 */
export async function authenticateJwt(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: 'VIEWER', // default until membership resolved
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token' },
    });
  }
}

/**
 * Enforces minimum role hierarchy for the active tenant.
 */
export function requireRole(minimumRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure user is authenticated
    if (!request.user) {
      await authenticateJwt(request, reply);
      if (reply.sent) return;
    }

    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string);
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'Tenant context is required for this operation' },
      });
    }

    // Verify membership in database
    const membership = await prisma.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: request.user!.userId,
        },
      },
    });

    if (!membership) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'User is not a member of this tenant workspace' },
      });
    }

    const userRole = membership.role as Role;
    request.user!.role = userRole;

    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Operation requires at least ${minimumRole} privileges`,
        },
      });
    }
  };
}
