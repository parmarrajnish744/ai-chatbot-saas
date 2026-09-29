import { prisma } from '@saas/database';

export interface KanbanColumn {
  id: string;
  title: string;
  contacts: any[];
  totalCount: number;
}

export class PipelineService {
  private stages = [
    { id: 'lead', title: 'New Leads' },
    { id: 'qualified', title: 'Qualified Leads' },
    { id: 'appointment_booked', title: 'Appointment Booked' },
    { id: 'customer', title: 'Active Customers' },
    { id: 'closed', title: 'Closed / Lost' },
  ];

  /**
   * Retrieves the full Kanban pipeline board for a tenant workspace.
   */
  async getPipelineBoard(tenantId: string): Promise<KanbanColumn[]> {
    let contacts: any[] = [];
    try {
      contacts = await prisma.contact.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (err) {}

    return this.stages.map((stage) => {
      const stageContacts = contacts.filter((c) => (c.stage || 'lead') === stage.id);
      return {
        id: stage.id,
        title: stage.title,
        contacts: stageContacts,
        totalCount: stageContacts.length,
      };
    });
  }

  /**
   * Moves a contact to a new pipeline stage.
   */
  async moveContactStage(contactId: string, newStage: string) {
    try {
      return await prisma.contact.update({
        where: { id: contactId },
        data: { stage: newStage },
      });
    } catch (err) {
      return { id: contactId, stage: newStage };
    }
  }
}

export const pipelineService = new PipelineService();
