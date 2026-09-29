import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service';

const authService = new AuthService();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(2),
  industryBlueprint: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);
      return reply.status(201).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error.message || 'Invalid registration request',
        },
      });
    }
  });

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);
      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error.message || 'Authentication failed',
        },
      });
    }
  });
}
