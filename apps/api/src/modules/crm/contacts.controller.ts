import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { contactsService } from './contacts.service';
import { pipelineService } from './pipeline.service';

const updateContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customAttributes: z.record(z.any()).optional(),
});

const moveStageSchema = z.object({
  stage: z.string().min(1),
});

export async function crmRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/crm/contacts
   */
  fastify.get('/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string) || 'default-tenant';
    const query = request.query as { search?: string; stage?: string };

    const contacts = await contactsService.listContacts(tenantId, query);
    return reply.status(200).send({ success: true, data: contacts });
  });

  /**
   * GET /api/v1/crm/contacts/:id/timeline
   */
  fastify.get('/contacts/:id/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const timeline = await contactsService.getContactTimeline(id);
    return reply.status(200).send({ success: true, data: timeline });
  });

  /**
   * PATCH /api/v1/crm/contacts/:id
   */
  fastify.patch('/contacts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const body = updateContactSchema.parse(request.body);
      const updated = await contactsService.updateContact(id, body);
      return reply.status(200).send({ success: true, data: updated });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: { message: error.message } });
    }
  });

  /**
   * GET /api/v1/crm/pipeline
   */
  fastify.get('/pipeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string) || 'default-tenant';
    const board = await pipelineService.getPipelineBoard(tenantId);
    return reply.status(200).send({ success: true, data: board });
  });

  /**
   * PATCH /api/v1/crm/contacts/:id/stage
   */
  fastify.patch('/contacts/:id/stage', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const body = moveStageSchema.parse(request.body);
      const updated = await pipelineService.moveContactStage(id, body.stage);
      return reply.status(200).send({ success: true, data: updated });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: { message: error.message } });
    }
  });
}
