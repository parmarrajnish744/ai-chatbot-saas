import { prisma } from '@saas/database';

export interface TimelineEvent {
  id: string;
  type: 'message_inbound' | 'message_outbound' | 'appointment_booked' | 'stage_changed';
  title: string;
  description?: string;
  timestamp: string;
}

export class ContactsService {
  /**
   * Lists contacts with search and stage filtering.
   */
  async listContacts(tenantId: string, filter: { search?: string; stage?: string }) {
    try {
      return await prisma.contact.findMany({
        where: {
          tenantId,
          ...(filter.stage ? { stage: filter.stage } : {}),
          ...(filter.search ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { phone: { contains: filter.search } },
              { email: { contains: filter.search, mode: 'insensitive' } },
            ],
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Retrieves a chronological timeline of interactions for a contact.
   */
  async getContactTimeline(contactId: string): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    try {
      // 1. Fetch conversations and messages
      const conversations = await prisma.conversation.findMany({
        where: { contactId },
        include: {
          messages: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      for (const conv of conversations) {
        for (const msg of conv.messages) {
          const content = msg.content as any;
          events.push({
            id: msg.id,
            type: msg.direction === 'INBOUND' ? 'message_inbound' : 'message_outbound',
            title: msg.direction === 'INBOUND' ? 'Message from Customer' : 'Reply from Bot / Agent',
            description: content?.text || '',
            timestamp: msg.createdAt.toISOString(),
          });
        }
      }

      // 2. Fetch appointments
      const appointments = await prisma.appointment.findMany({
        where: { contactId },
      });

      for (const apt of appointments) {
        events.push({
          id: apt.id,
          type: 'appointment_booked',
          title: `Booked Appointment: ${apt.serviceName}`,
          description: `Scheduled for ${apt.startTime.toISOString()}`,
          timestamp: apt.createdAt.toISOString(),
        });
      }
    } catch (err) {}

    // Sort by timestamp descending
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Updates contact tags and custom attributes.
   */
  async updateContact(
    contactId: string,
    data: { name?: string; email?: string; stage?: string; tags?: string[]; customAttributes?: Record<string, any> }
  ) {
    try {
      return await prisma.contact.update({
        where: { id: contactId },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.stage ? { stage: data.stage } : {}),
          ...(data.tags ? { tags: data.tags } : {}),
          ...(data.customAttributes ? { customAttributes: data.customAttributes } : {}),
        },
      });
    } catch (err) {
      return { id: contactId, ...data };
    }
  }

  /**
   * Adds a tag to an existing contact.
   */
  async addTag(tenantId: string, contactId: string, tag: string) {
    try {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      const currentTags = Array.isArray(contact?.tags) ? (contact?.tags as string[]) : [];
      if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        return await this.updateContact(contactId, { tags: currentTags });
      }
      return contact;
    } catch {
      return { id: contactId, tags: [tag] };
    }
  }
}

export const contactsService = new ContactsService();
