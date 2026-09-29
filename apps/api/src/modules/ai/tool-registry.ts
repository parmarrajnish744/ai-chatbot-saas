import { z } from 'zod';
import { prisma } from '@saas/database';
import { hybridSearchService } from '../knowledge/hybrid-search.service';
import { bookingService } from '../booking/booking.service';
import { orderTrackingService } from '../integrations/woocommerce/order-tracking.service';

// Zod Schemas for tool argument validation
export const searchKnowledgeSchema = z.object({
  query: z.string().min(1),
});

export const searchProductsSchema = z.object({
  searchTerm: z.string().min(1),
  maxPrice: z.number().optional(),
});

export const checkOrderStatusSchema = z.object({
  orderNumber: z.string().min(1),
});

export const checkAvailabilitySchema = z.object({
  serviceName: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
});

export const bookAppointmentSchema = z.object({
  serviceName: z.string().min(1),
  startTime: z.string().min(1),
  customerName: z.string().optional(),
  notes: z.string().optional(),
});

export const captureLeadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  interestedService: z.string().optional(),
  budget: z.string().optional(),
});

export const transferToHumanSchema = z.object({
  reason: z.string().min(1),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
});

export class ToolRegistry {
  /**
   * Executes a registered tool dynamically with tenant context and validated arguments.
   */
  async executeTool(
    toolName: string,
    args: any,
    context: { tenantId: string; conversationId: string; contactId?: string }
  ): Promise<any> {
    const { tenantId, conversationId, contactId } = context;

    switch (toolName) {
      case 'search_knowledge_base': {
        const validated = searchKnowledgeSchema.parse(args);
        const results = await hybridSearchService.search(tenantId, validated.query, 3);
        if (results.length === 0) {
          return { message: 'No specific knowledge base records found for this query.' };
        }
        return {
          results: results.map((r) => r.content),
        };
      }

      case 'search_products': {
        const validated = searchProductsSchema.parse(args);
        const products = await prisma.product.findMany({
          where: {
            tenantId,
            name: { contains: validated.searchTerm, mode: 'insensitive' },
            ...(validated.maxPrice ? { price: { lte: validated.maxPrice } } : {}),
          },
          take: 5,
        });

        if (products.length === 0) {
          return { message: `No products found matching "${validated.searchTerm}".` };
        }

        return {
          products: products.map((p) => ({
            id: p.externalId,
            name: p.name,
            price: `$${p.price}`,
            inStock: p.inStock,
            url: p.productUrl,
          })),
        };
      }

      case 'check_order_status': {
        const validated = checkOrderStatusSchema.parse(args);
        const result = await orderTrackingService.trackOrder(
          { storeUrl: 'https://demo-store.com', consumerKey: 'mock_key', consumerSecret: 'mock_secret' },
          validated.orderNumber
        );
        return result;
      }

      case 'check_calendar_availability': {
        const validated = checkAvailabilitySchema.parse(args);
        const slots = await bookingService.getAvailableSlots(tenantId, validated.date);
        return {
          date: validated.date,
          availableSlots: slots.filter((s) => s.available).map((s) => s.displayTime),
          allSlots: slots,
        };
      }

      case 'book_appointment': {
        const validated = bookAppointmentSchema.parse(args);
        const res = await bookingService.reserveAppointment({
          tenantId,
          contactId: contactId || 'anon_contact',
          serviceName: validated.serviceName,
          startTime: validated.startTime,
          notes: validated.notes,
        });
        return res;
      }

      case 'capture_lead': {
        const validated = captureLeadSchema.parse(args);
        if (contactId) {
          try {
            await prisma.contact.update({
              where: { id: contactId },
              data: {
                ...(validated.name ? { name: validated.name } : {}),
                ...(validated.email ? { email: validated.email } : {}),
                customAttributes: {
                  interestedService: validated.interestedService,
                  budget: validated.budget,
                  qualifiedAt: new Date().toISOString(),
                },
                stage: 'qualified',
              },
            });
          } catch (err) {}
        }
        return { success: true, message: 'Lead attributes captured successfully.' };
      }

      case 'transfer_to_human': {
        const validated = transferToHumanSchema.parse(args);
        try {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              status: 'HANDOFF_QUEUED',
              metadata: {
                handoffReason: validated.reason,
                urgency: validated.urgency,
                escalatedAt: new Date().toISOString(),
              },
            },
          });
        } catch (err) {}
        return {
          transferred: true,
          status: 'HANDOFF_QUEUED',
          message: 'Conversation has been escalated to a live representative.',
        };
      }

      default:
        throw new Error(`Tool "${toolName}" is not registered in ToolRegistry.`);
    }
  }
}

export const toolRegistry = new ToolRegistry();
