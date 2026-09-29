export interface SearchKnowledgeBaseArgs {
  query: string;
}

export interface SearchProductsArgs {
  searchTerm: string;
  maxPrice?: number;
}

export interface CheckOrderStatusArgs {
  orderNumber: string;
}

export interface CheckCalendarAvailabilityArgs {
  serviceName?: string;
  date: string; // YYYY-MM-DD
}

export interface BookAppointmentArgs {
  serviceName: string;
  startTime: string; // ISO 8601
  customerName?: string;
  notes?: string;
}

export interface CaptureLeadArgs {
  name?: string;
  email?: string;
  interestedService?: string;
  budget?: string;
}

export interface TransferToHumanArgs {
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export type ToolInvocationMap = {
  search_knowledge_base: SearchKnowledgeBaseArgs;
  search_products: SearchProductsArgs;
  check_order_status: CheckOrderStatusArgs;
  check_calendar_availability: CheckCalendarAvailabilityArgs;
  book_appointment: BookAppointmentArgs;
  capture_lead: CaptureLeadArgs;
  transfer_to_human: TransferToHumanArgs;
};
