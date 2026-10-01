'use client';

import { useState, useEffect } from 'react';
import {
  Kanban,
  Users,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  stage: 'lead' | 'qualified' | 'appointment' | 'customer';
  service?: string;
  budget?: string;
  lastActive: string;
}

const STAGES = [
  { id: 'lead', name: 'New Leads', color: 'border-slate-500/40 text-slate-300' },
  { id: 'qualified', name: 'AI Qualified', color: 'border-cyan-500/40 text-cyan-300' },
  { id: 'appointment', name: 'Appointment Booked', color: 'border-indigo-500/40 text-indigo-300' },
  { id: 'customer', name: 'Closed Customer', color: 'border-emerald-500/40 text-emerald-300' },
];

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 'c-1',
      name: 'Sarah Connor',
      phone: '+1 415-555-2671',
      email: 'sarah.c@cyber.io',
      stage: 'lead',
      service: 'Retail Catalog Inquiries',
      lastActive: '5m ago',
    },
    {
      id: 'c-2',
      name: 'Marcus Vance',
      phone: '+1 415-555-8902',
      email: 'm.vance@techcorp.com',
      stage: 'qualified',
      service: 'Enterprise Multi-Seat Bot',
      budget: '$5,000 / yr',
      lastActive: '12m ago',
    },
    {
      id: 'c-3',
      name: 'Elena Rostova',
      phone: '+1 415-555-4433',
      email: 'elena@wellness.org',
      stage: 'appointment',
      service: 'VIP Dental Consultation',
      budget: '$450',
      lastActive: '1h ago',
    },
    {
      id: 'c-4',
      name: 'David Kim',
      phone: '+1 415-555-7711',
      email: 'david.k@kims.net',
      stage: 'customer',
      service: 'Signature Coffee Bundle',
      budget: '$180',
      lastActive: '3h ago',
    },
    {
      id: 'c-5',
      name: 'Jessica Alba',
      phone: '+1 415-555-9012',
      email: 'jessica@studio.design',
      stage: 'qualified',
      service: 'Salon & Spa Deluxe Package',
      budget: '$250',
      lastActive: 'Yesterday',
    },
  ]);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const moveStage = (contactId: string, nextStage: Contact['stage']) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, stage: nextStage } : c))
    );
    apiClient.moveContactStage(contactId, nextStage);
  };

  const getNextStage = (current: Contact['stage']): Contact['stage'] | null => {
    if (current === 'lead') return 'qualified';
    if (current === 'qualified') return 'appointment';
    if (current === 'appointment') return 'customer';
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Kanban className="w-6 h-6 text-indigo-400" />
            CRM Lead Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated lead qualification, budget capture, and appointment scheduling board.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            {contacts.length} Total Contacts Tracked
          </span>
        </div>
      </div>

      {/* Kanban Board 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageContacts = contacts.filter((c) => c.stage === stage.id);

          return (
            <div
              key={stage.id}
              className="glass-panel p-4 rounded-2xl flex flex-col min-h-[500px] border-t-2"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <span className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                  {stage.name}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface-900 border border-white/10 text-xs font-mono text-slate-300">
                  {stageContacts.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {stageContacts.map((contact) => {
                  const next = getNextStage(contact.stage);

                  return (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="p-3.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-indigo-300">
                          {contact.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {contact.lastActive}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-400 truncate">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{contact.phone}</span>
                        </div>
                        {contact.service && (
                          <div className="flex items-center gap-1.5 text-cyan-300 truncate">
                            <Tag className="w-3 h-3 text-cyan-500" />
                            <span>{contact.service}</span>
                          </div>
                        )}
                        {contact.budget && (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                            <DollarSign className="w-3 h-3" />
                            <span>{contact.budget}</span>
                          </div>
                        )}
                      </div>

                      {/* Advance Stage button */}
                      {next && (
                        <div className="pt-2 border-t border-white/5 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStage(contact.id, next);
                            }}
                            className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-medium flex items-center gap-1 transition-all"
                          >
                            Advance <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact Detail Modal / Drawer */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  {selectedContact.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedContact.name}</h3>
                  <p className="text-[10px] text-slate-400">ID: {selectedContact.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white glass-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-900 border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-white font-mono">{selectedContact.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white">{selectedContact.email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Stage:</span>
                  <span className="text-indigo-400 font-bold uppercase">{selectedContact.stage}</span>
                </div>
                {selectedContact.budget && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Qualified Budget:</span>
                    <span className="text-emerald-400 font-bold font-mono">{selectedContact.budget}</span>
                  </div>
                )}
                {selectedContact.service && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interested Service:</span>
                    <span className="text-cyan-300 font-medium">{selectedContact.service}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Update Pipeline Stage</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        moveStage(selectedContact.id, s.id as any);
                        setSelectedContact({ ...selectedContact, stage: s.id as any });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedContact.stage === s.id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'glass-button text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedContact(null)}
              className="w-full py-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-slate-300 text-xs font-medium border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
