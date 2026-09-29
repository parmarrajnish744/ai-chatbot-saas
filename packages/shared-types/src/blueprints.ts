export interface IndustryBlueprint {
  id: 'restaurant' | 'clinic' | 'salon' | 'real_estate' | 'ecommerce' | 'education' | 'agency';
  name: string;
  defaultPrompt: string;
  enabledTools: string[];
  sampleFaqs: Array<{ question: string; answer: string }>;
  customAttributes: Array<{ key: string; label: string; type: 'string' | 'number' | 'boolean' }>;
}

export const INDUSTRY_BLUEPRINTS: Record<string, IndustryBlueprint> = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & Dining',
    defaultPrompt: 'You are an attentive and welcoming concierge for our restaurant. Assist guests with menu recommendations, allergen inquiries, opening hours, and table bookings.',
    enabledTools: ['search_knowledge_base', 'check_calendar_availability', 'book_appointment', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'What are your hours?', answer: 'We are open Monday to Sunday from 11:30 AM to 10:30 PM.' },
      { question: 'Do you have vegan options?', answer: 'Yes, we have a dedicated vegan section featuring plant-based pastas, burgers, and salads.' }
    ],
    customAttributes: [
      { key: 'party_size', label: 'Party Size', type: 'number' },
      { key: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'string' }
    ]
  },
  clinic: {
    id: 'clinic',
    name: 'Healthcare & Clinic',
    defaultPrompt: 'You are a warm, professional, and empathetic medical receptionist. Help patients find available appointment slots, verify doctor specialties, and understand clinic procedures. Always advise emergency patients to call emergency services.',
    enabledTools: ['search_knowledge_base', 'check_calendar_availability', 'book_appointment', 'capture_lead', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'What insurance do you accept?', answer: 'We accept BlueCross, Aetna, Cigna, Medicare, and UnitedHealthcare.' },
      { question: 'What should I bring to my appointment?', answer: 'Please bring a valid photo ID, insurance card, and a list of any current medications.' }
    ],
    customAttributes: [
      { key: 'patient_type', label: 'Patient Type (New/Returning)', type: 'string' },
      { key: 'insurance_provider', label: 'Insurance Provider', type: 'string' }
    ]
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce & Retail',
    defaultPrompt: 'You are an energetic and helpful shopping assistant. Help customers discover products, track their orders, check return policies, and finalize purchases with direct checkout links.',
    enabledTools: ['search_knowledge_base', 'search_products', 'check_order_status', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'What is your return policy?', answer: 'We offer a 30-day hassle-free return window for unworn items with original tags.' },
      { question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days. Express takes 1-2 business days.' }
    ],
    customAttributes: [
      { key: 'preferred_category', label: 'Preferred Category', type: 'string' },
      { key: 'vip_status', label: 'VIP Status', type: 'boolean' }
    ]
  },
  salon: {
    id: 'salon',
    name: 'Salon & Spa',
    defaultPrompt: 'You are a chic, friendly salon and spa concierge. Help clients explore haircuts, color styling, facials, and spa treatments. Assist with finding availability with their favorite stylist and booking appointments.',
    enabledTools: ['search_knowledge_base', 'check_calendar_availability', 'book_appointment', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'What is your cancellation policy?', answer: 'We kindly request at least 24 hours notice for cancellations or rescheduling to avoid a cancellation fee.' },
      { question: 'Do I need a consultation before hair coloring?', answer: 'For major color transformations or balayage, we recommend a complimentary 15-minute consultation.' }
    ],
    customAttributes: [
      { key: 'preferred_stylist', label: 'Preferred Stylist', type: 'string' },
      { key: 'hair_or_skin_type', label: 'Hair/Skin Type', type: 'string' }
    ]
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate & Properties',
    defaultPrompt: 'You are an upscale, knowledgeable real estate assistant. Help prospective buyers, sellers, and tenants find relevant properties, schedule viewings, and connect with licensed agents. Qualify their budget, preferred location, and timeline.',
    enabledTools: ['search_knowledge_base', 'capture_lead', 'check_calendar_availability', 'book_appointment', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'How do I schedule a home viewing?', answer: 'You can select any property and pick an available tour slot right here, or I can connect you with the listing agent.' },
      { question: 'What documents are required to apply for a rental?', answer: 'We typically require government ID, proof of income (last 3 pay stubs or tax return), and a credit check authorization.' }
    ],
    customAttributes: [
      { key: 'property_interest', label: 'Interest (Buy/Rent/Sell)', type: 'string' },
      { key: 'target_budget', label: 'Target Budget ($)', type: 'number' },
      { key: 'preferred_location', label: 'Preferred Neighborhood', type: 'string' }
    ]
  },
  education: {
    id: 'education',
    name: 'Education & Academics',
    defaultPrompt: 'You are an inspiring, informative academic admissions advisor. Help prospective students, parents, and applicants learn about academic programs, admissions criteria, application deadlines, tuition, and campus tours.',
    enabledTools: ['search_knowledge_base', 'capture_lead', 'check_calendar_availability', 'book_appointment', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'What are the application deadlines for the upcoming semester?', answer: 'Early decision applications close on November 1st, and regular admissions close on January 15th.' },
      { question: 'Are scholarships and financial aid available?', answer: 'Yes! Over 80% of our students receive merit-based or need-based financial aid. Complete the financial aid form upon applying.' }
    ],
    customAttributes: [
      { key: 'program_of_interest', label: 'Program of Interest', type: 'string' },
      { key: 'academic_year', label: 'Intended Start Year', type: 'number' }
    ]
  },
  agency: {
    id: 'agency',
    name: 'Digital Agency & B2B Services',
    defaultPrompt: 'You are an elite, consultative sales development representative for our digital agency. Guide clients through our services (web development, design, growth marketing), qualify their budget and timeline, and schedule a discovery call with our leadership.',
    enabledTools: ['search_knowledge_base', 'capture_lead', 'check_calendar_availability', 'book_appointment', 'transfer_to_human'],
    sampleFaqs: [
      { question: 'What services do you provide?', answer: 'We specialize in full-stack web and mobile development, UI/UX design, custom AI agent integrations, and growth marketing.' },
      { question: 'What is your typical project timeline?', answer: 'Sprint-based MVP projects typically launch in 4-8 weeks, while full enterprise transformations range from 3-6 months.' }
    ],
    customAttributes: [
      { key: 'project_budget_tier', label: 'Budget Tier', type: 'string' },
      { key: 'company_name', label: 'Company Name', type: 'string' }
    ]
  }
};
