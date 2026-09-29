import { eventBusService, TenantEvent } from './event-bus.service';
import { sendTemplateAction } from './actions/send-template.action';
import { webhookAction } from './actions/webhook.action';
import { internalAlertAction } from './actions/internal-alert.action';
import { contactsService } from '../crm/contacts.service';
import { pipelineService } from '../crm/pipeline.service';
import { prisma, withTenantContext } from '@saas/database';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'in';
  value: any;
}

export interface WorkflowAction {
  type: 'send_template' | 'send_webhook' | 'internal_alert' | 'add_tag' | 'update_stage';
  config: any;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  trigger: string;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  createdAt?: Date;
}

export class WorkflowEngineService {
  private inMemoryWorkflows: Map<string, WorkflowDefinition> = new Map();
  private isListening = false;

  constructor() {
    this.startListener();
  }

  /**
   * Initializes event listener on the bus
   */
  startListener(): void {
    if (this.isListening) return;
    this.isListening = true;

    eventBusService.subscribe('*', async (event: TenantEvent) => {
      await this.processEvent(event);
    });
  }

  /**
   * Process an incoming event against active workflows
   */
  async processEvent(event: TenantEvent): Promise<{ executedWorkflows: string[]; errors: string[] }> {
    const executedWorkflows: string[] = [];
    const errors: string[] = [];

    const workflows = await this.listActiveWorkflowsForTrigger(event.tenantId, event.eventType);

    for (const workflow of workflows) {
      if (!this.matchesConditions(workflow.conditions, event.data)) {
        continue;
      }

      try {
        for (const action of workflow.actions) {
          await this.executeAction(action, event);
        }
        executedWorkflows.push(workflow.id);
      } catch (err: any) {
        errors.push(`Workflow ${workflow.id} error: ${err.message}`);
      }
    }

    return { executedWorkflows, errors };
  }

  /**
   * Evaluate conditions array against event data
   */
  matchesConditions(conditions: WorkflowCondition[] | undefined, data: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((cond) => {
      const parts = cond.field.split('.');
      let val = data;
      for (const p of parts) {
        if (val === undefined || val === null) {
          val = undefined;
          break;
        }
        val = val[p];
      }

      switch (cond.operator) {
        case 'equals':
          return String(val).toLowerCase() === String(cond.value).toLowerCase();
        case 'not_equals':
          return String(val).toLowerCase() !== String(cond.value).toLowerCase();
        case 'contains':
          return String(val).toLowerCase().includes(String(cond.value).toLowerCase());
        case 'not_contains':
          return !String(val).toLowerCase().includes(String(cond.value).toLowerCase());
        case 'greater_than':
          return Number(val) > Number(cond.value);
        case 'in':
          return Array.isArray(cond.value) && cond.value.includes(val);
        default:
          return true;
      }
    });
  }

  /**
   * Execute an individual workflow action
   */
  async executeAction(action: WorkflowAction, event: TenantEvent): Promise<any> {
    switch (action.type) {
      case 'send_template':
        return await sendTemplateAction.execute(action.config, event.data, action.config.channelId);

      case 'send_webhook':
        return await webhookAction.execute(action.config, {
          eventType: event.eventType,
          tenantId: event.tenantId,
          timestamp: event.timestamp || new Date().toISOString(),
          data: event.data
        });

      case 'internal_alert':
        return await internalAlertAction.execute(action.config, event);

      case 'add_tag':
        if (event.data?.contactId && action.config?.tag) {
          return await contactsService.addTag(event.tenantId, event.data.contactId, action.config.tag);
        }
        break;

      case 'update_stage':
        if (event.data?.contactId && action.config?.stage) {
          return await pipelineService.moveContactStage(event.data.contactId, action.config.stage);
        }
        break;
    }
  }

  /**
   * Fetch active workflows matching a specific trigger
   */
  async listActiveWorkflowsForTrigger(tenantId: string, trigger: string): Promise<WorkflowDefinition[]> {
    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return (prisma as any).automationWorkflow.findMany({
          where: {
            tenantId,
            trigger,
            isActive: true
          }
        });
      });

      const res = await Promise.race([
        dbPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 300))
      ]);

      if (res && Array.isArray(res)) {
        return res.map((r: any) => ({
          id: r.id,
          tenantId: r.tenantId,
          name: r.name,
          trigger: r.trigger,
          conditions: (r.config as any)?.conditions || [],
          actions: (r.config as any)?.actions || [],
          isActive: r.isActive
        }));
      }
    } catch {
      // In-memory fallback
    }

    return Array.from(this.inMemoryWorkflows.values()).filter(
      (w) => w.tenantId === tenantId && (w.trigger === trigger || w.trigger === '*') && w.isActive
    );
  }

  /**
   * Create a new automation workflow
   */
  async createWorkflow(
    tenantId: string,
    data: {
      name: string;
      trigger: string;
      conditions?: WorkflowCondition[];
      actions: WorkflowAction[];
      isActive?: boolean;
    }
  ): Promise<WorkflowDefinition> {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workflow: WorkflowDefinition = {
      id,
      tenantId,
      name: data.name,
      trigger: data.trigger,
      conditions: data.conditions || [],
      actions: data.actions || [],
      isActive: data.isActive !== false,
      createdAt: new Date()
    };

    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return (prisma as any).automationWorkflow.create({
          data: {
            id,
            tenantId,
            name: workflow.name,
            trigger: workflow.trigger,
            config: {
              conditions: workflow.conditions,
              actions: workflow.actions
            },
            isActive: workflow.isActive
          }
        });
      });

      await Promise.race([
        dbPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 300))
      ]);
    } catch {
      // In-memory fallback
    }

    this.inMemoryWorkflows.set(id, workflow);
    return workflow;
  }

  /**
   * List all workflows for a tenant
   */
  async listWorkflows(tenantId: string): Promise<WorkflowDefinition[]> {
    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return (prisma as any).automationWorkflow.findMany({
          where: { tenantId }
        });
      });

      const res = await Promise.race([
        dbPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 300))
      ]);

      if (res && Array.isArray(res)) {
        return res.map((r: any) => ({
          id: r.id,
          tenantId: r.tenantId,
          name: r.name,
          trigger: r.trigger,
          conditions: (r.config as any)?.conditions || [],
          actions: (r.config as any)?.actions || [],
          isActive: r.isActive
        }));
      }
    } catch {
      // fallback
    }

    return Array.from(this.inMemoryWorkflows.values()).filter((w) => w.tenantId === tenantId);
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(tenantId: string, id: string): Promise<boolean> {
    try {
      const dbPromise = withTenantContext(tenantId, async () => {
        return (prisma as any).automationWorkflow.deleteMany({
          where: { id, tenantId }
        });
      });

      await Promise.race([
        dbPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 300))
      ]);
    } catch {
      // fallback
    }

    return this.inMemoryWorkflows.delete(id);
  }

  /**
   * Clear in-memory workflows (for testing)
   */
  clearInMemory(): void {
    this.inMemoryWorkflows.clear();
  }
}

export const workflowEngineService = new WorkflowEngineService();
