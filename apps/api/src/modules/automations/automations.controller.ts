import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { workflowEngineService } from './workflow-engine.service';
import { eventBusService } from './event-bus.service';
import { blueprintService } from '../blueprints/blueprint.service';
import { authenticateJwt } from '../../middlewares/rbac.middleware';

export async function automationsRoutes(fastify: FastifyInstance): Promise<void> {
  const getTenantId = (req: FastifyRequest) => {
    return req.tenantId || (req.headers['x-tenant-id'] as string) || (req.user as any)?.tenantId || '11111111-1111-1111-1111-111111111111';
  };

  // GET /api/v1/automations - List workflows
  fastify.get('/automations', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request);
    const workflows = await workflowEngineService.listWorkflows(tenantId);
    return reply.send({ success: true, data: workflows });
  });

  // POST /api/v1/automations - Create workflow
  fastify.post('/automations', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request);
    const body = request.body as any;

    if (!body.name || !body.trigger || !body.actions) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required fields: name, trigger, and actions are required'
      });
    }

    const workflow = await workflowEngineService.createWorkflow(tenantId, {
      name: body.name,
      trigger: body.trigger,
      conditions: body.conditions,
      actions: body.actions,
      isActive: body.isActive
    });

    return reply.status(201).send({ success: true, data: workflow });
  });

  // DELETE /api/v1/automations/:id - Delete workflow
  fastify.delete('/automations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = getTenantId(request);
    const success = await workflowEngineService.deleteWorkflow(tenantId, request.params.id);
    return reply.send({ success });
  });

  // POST /api/v1/automations/trigger - Publish event
  fastify.post('/automations/trigger', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request);
    const body = request.body as any;

    if (!body.eventType) {
      return reply.status(400).send({ success: false, error: 'eventType is required' });
    }

    await eventBusService.publish({
      tenantId,
      eventType: body.eventType,
      timestamp: new Date().toISOString(),
      data: body.data || {}
    });

    return reply.send({ success: true, message: `Event ${body.eventType} published` });
  });

  // GET /api/v1/blueprints - List available presets
  fastify.get('/blueprints', async (_request: FastifyRequest, reply: FastifyReply) => {
    const blueprints = blueprintService.getAvailableBlueprints();
    return reply.send({ success: true, data: blueprints });
  });

  // POST /api/v1/blueprints/apply - Apply blueprint to tenant
  fastify.post('/blueprints/apply', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request);
    const { blueprintId } = request.body as any;

    if (!blueprintId) {
      return reply.status(400).send({ success: false, error: 'blueprintId is required' });
    }

    try {
      const result = await blueprintService.applyBlueprint(tenantId, blueprintId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });
}
