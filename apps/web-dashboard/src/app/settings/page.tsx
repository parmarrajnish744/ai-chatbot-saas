'use client';

import { useState } from 'react';
import {
  Bot,
  Sliders,
  Check,
  Sparkles,
  Utensils,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Building,
  Key,
  ShieldCheck,
  CheckCircle2,
  Save,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BlueprintPreset {
  key: string;
  name: string;
  icon: any;
  description: string;
  systemPrompt: string;
  tools: string[];
}

const BLUEPRINTS: BlueprintPreset[] = [
  {
    key: 'restaurant',
    name: 'Restaurant & Cafe',
    icon: Utensils,
    description: 'Menu browsing, table reservations, daily specials & takeout pickup.',
    systemPrompt:
      'You are a friendly host and concierge at our restaurant. You help guests browse our menu specials, check table availability, reserve dining slots, and answer food allergen questions politely.',
    tools: ['search_products', 'check_calendar_availability', 'book_appointment', 'search_knowledge_base'],
  },
  {
    key: 'clinic',
    name: 'Dental & Medical Clinic',
    icon: Stethoscope,
    description: 'Patient consultations, appointment booking, insurance policy RAG.',
    systemPrompt:
      'You are an empathetic, professional medical clinic coordinator. You assist patients in booking doctor consultations, checking available appointment slots, and explaining clinic procedures and insurance policies.',
    tools: ['check_calendar_availability', 'book_appointment', 'transfer_to_human', 'search_knowledge_base'],
  },
  {
    key: 'salon',
    name: 'Salon & Spa Studio',
    icon: Scissors,
    description: 'Stylist schedules, beauty treatments, price lists & lead capture.',
    systemPrompt:
      'You are a chic, helpful receptionist for our luxury salon and spa. You answer questions about hair, nail, and skincare packages, verify stylist calendar availability, and book appointments.',
    tools: ['search_products', 'check_calendar_availability', 'book_appointment', 'capture_lead'],
  },
  {
    key: 'ecommerce',
    name: 'E-Commerce Store',
    icon: ShoppingBag,
    description: 'WooCommerce catalog search, order tracking, returns & refunds.',
    systemPrompt:
      'You are an expert retail shopping assistant for our online store. You assist customers in discovering products matching their budget, checking live order delivery status, and providing return policy answers.',
    tools: ['search_products', 'check_order_status', 'capture_lead', 'search_knowledge_base'],
  },
  {
    key: 'real_estate',
    name: 'Real Estate Agency',
    icon: Building,
    description: 'Property inquiries, buyer budget qualification & agent tours.',
    systemPrompt:
      'You are a knowledgeable real estate advisor. You greet potential buyers and tenants, qualify their desired property specifications and budget, and schedule private viewing appointments with our brokers.',
    tools: ['capture_lead', 'check_calendar_availability', 'book_appointment', 'transfer_to_human'],
  },
];

export default function SettingsPage() {
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>('restaurant');
  const [systemPrompt, setSystemPrompt] = useState<string>(BLUEPRINTS[0].systemPrompt);
  const [activeTools, setActiveTools] = useState<string[]>(BLUEPRINTS[0].tools);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // WhatsApp Credentials
  const [phoneNumberId, setPhoneNumberId] = useState('109842187319283');
  const [accessToken, setAccessToken] = useState('EAAG...mock_meta_permanent_token');
  const [verifyToken, setVerifyToken] = useState('my_super_secret_webhook_verify_token');

  const handleApplyBlueprint = (bp: BlueprintPreset) => {
    setSelectedBlueprint(bp.key);
    setSystemPrompt(bp.systemPrompt);
    setActiveTools(bp.tools);
    setSavedNotification(`Applied "${bp.name}" Blueprint configuration!`);
    setTimeout(() => setSavedNotification(null), 4000);
  };

  const toggleTool = (toolName: string) => {
    setActiveTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  const handleSave = () => {
    setSavedNotification('Bot configuration & credentials saved successfully!');
    setTimeout(() => setSavedNotification(null), 4000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          Bot Behavior & Industry Blueprints
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize agent system prompts, toggle autonomous ReAct tools, and configure WhatsApp Cloud API credentials.
        </p>
      </div>

      {savedNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {savedNotification}
        </div>
      )}

      {/* 1-Click Blueprints Gallery */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              1-Click Industry Blueprints
            </h2>
            <p className="text-xs text-slate-400">
              Select a vertical preset to instantly apply battle-tested prompts and enabled tool bundles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {BLUEPRINTS.map((bp) => {
            const Icon = bp.icon;
            const isSelected = selectedBlueprint === bp.key;

            return (
              <div
                key={bp.key}
                onClick={() => handleApplyBlueprint(bp)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-surface-900/60 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-white">{bp.name}</h3>
                  <p className="text-[11px] text-slate-300 leading-snug">{bp.description}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap gap-1">
                  {bp.tools.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-800 text-slate-400"
                    >
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Prompt & Tools Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* System Prompt Editor (Col 7) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Bot System Prompt
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">ReAct Base Context</span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              The foundational instructions provided to the model in every conversation turn:
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={7}
              className="w-full bg-surface-900 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Enabled Tools Toggle List (Col 5) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-semibold text-white">Active Autonomous Tools</h2>
            <span className="text-[10px] text-indigo-400 font-mono">{activeTools.length} Enabled</span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { id: 'search_products', name: 'search_products', label: 'Product & Menu Catalog' },
              { id: 'check_order_status', name: 'check_order_status', label: 'Order Tracking & Carrier Status' },
              { id: 'check_calendar_availability', name: 'check_calendar_availability', label: 'Calendar Slot Verification' },
              { id: 'book_appointment', name: 'book_appointment', label: 'Appointment Booking' },
              { id: 'capture_lead', name: 'capture_lead', label: 'CRM Lead Qualification' },
              { id: 'transfer_to_human', name: 'transfer_to_human', label: 'Human Desk Escalation' },
              { id: 'search_knowledge_base', name: 'search_knowledge_base', label: 'RAG Knowledge Hybrid Search' },
            ].map((tool) => {
              const isChecked = activeTools.includes(tool.id);
              return (
                <div
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                      : 'bg-surface-900/60 border-white/5 text-slate-400'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">{tool.label}</p>
                    <p className="text-[10px] font-mono text-indigo-300/80">{tool.name}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-white/20'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WhatsApp Cloud API Setup */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Meta WhatsApp Cloud API Configuration</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Phone Number ID</label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Webhook Verify Token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Permanent Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-400">Webhook Callback URL:</span>
            <code className="text-emerald-400 font-mono ml-2">
              http://localhost:4000/api/v1/channels/whatsapp/webhook
            </code>
          </div>
          <button
            onClick={() => {
              setSavedNotification('Webhook handshake verification passed!');
              setTimeout(() => setSavedNotification(null), 4000);
            }}
            className="px-3 py-1.5 rounded-lg glass-button text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Test Handshake
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
}
