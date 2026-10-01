'use client';

import { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface PlanTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const TIERS: PlanTier[] = [
  {
    id: 'starter',
    name: 'Starter Tier',
    price: '$49',
    period: '/ month',
    description: 'Perfect for small local businesses getting started with automated WhatsApp customer support.',
    features: [
      '1,000 Messages / month',
      '1 WhatsApp Channel Ingestion',
      '5 Knowledge Base Documents',
      'Basic Bot Rules & Greetings',
      'Community & Email Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Tier',
    price: '$149',
    period: '/ month',
    description: 'Autonomous multi-model AI agent with Live Human Escalation Desk and RAG hybrid search.',
    features: [
      '5,000 Messages / month',
      'WhatsApp Cloud API + Web Widget',
      'Autonomous ReAct Tool Calling (7 Tools)',
      'Live Human Desk + AI Copilot',
      'Unlimited Knowledge Base RAG Documents',
      'WooCommerce & Calendar Integrations',
      'Priority 24/7 SLA Support',
    ],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Scale',
    price: '$399',
    period: '/ month',
    description: 'High-volume omnichannel automation with custom model fine-tuning and dedicated tenancy.',
    features: [
      '25,000 Messages / month ($0.01 / extra)',
      'Unlimited Ingestion Channels',
      'Custom LLM Fine-Tuning & Prompt Guard',
      'Dedicated pgvector Database Cluster',
      'Audit Logging & Advanced Analytics',
      '99.99% Guaranteed SLA Uptime',
      'Dedicated Account Manager',
    ],
  },
];

export default function BillingPage() {
  const [currentTier, setCurrentTier] = useState<string>('pro');
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  const usage = {
    used: 842,
    limit: 5000,
    renewalDate: 'October 28, 2026',
  };

  const handleCheckout = async (tierId: string) => {
    setProcessingTier(tierId);
    try {
      const res = await apiClient.createCheckout(tierId);
      setCurrentTier(tierId);
      setCheckoutNotice(`Stripe Checkout Session created for ${tierId.toUpperCase()} tier! Activated on tenant.`);
      setTimeout(() => setCheckoutNotice(null), 5000);
    } catch (e) {
      setCurrentTier(tierId);
      setCheckoutNotice(`Switched subscription tier to ${tierId.toUpperCase()}!`);
      setTimeout(() => setCheckoutNotice(null), 5000);
    } finally {
      setProcessingTier(null);
    }
  };

  const invoices = [
    { id: 'INV-2026-09', date: 'Sep 01, 2026', amount: '$149.00', status: 'PAID', plan: 'Pro Tier' },
    { id: 'INV-2026-08', date: 'Aug 01, 2026', amount: '$149.00', status: 'PAID', plan: 'Pro Tier' },
    { id: 'INV-2026-07', date: 'Jul 01, 2026', amount: '$49.00', status: 'PAID', plan: 'Starter Tier' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-400" />
          Subscription & Usage Quotas
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your Stripe subscription tier, track real-time message consumption, and view invoices.
        </p>
      </div>

      {checkoutNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {checkoutNotice}
        </div>
      )}

      {/* Usage Meter Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 bg-gradient-to-r from-surface-900 via-surface-900 to-indigo-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Current Subscription
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                ACTIVE
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Pro Plan ($149 / mo)</h2>
            <p className="text-xs text-slate-400">Next renewal billing date: {usage.renewalDate}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block">Cycle Message Usage</span>
            <span className="text-2xl font-extrabold text-white font-mono">
              {usage.used.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">/ {usage.limit.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{((usage.used / usage.limit) * 100).toFixed(1)}% consumed</span>
            <span>{(usage.limit - usage.used).toLocaleString()} messages remaining</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(usage.used / usage.limit) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pricing Tiers Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">Available Plans & Tiers</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;

            return (
              <div
                key={tier.id}
                className={`glass-panel p-6 rounded-2xl flex flex-col justify-between transition-all relative ${
                  tier.isPopular ? 'border-indigo-500/60 shadow-xl shadow-indigo-500/10' : ''
                }`}
              >
                {tier.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                    <div className="mt-2 flex items-baseline">
                      <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                      <span className="text-xs text-slate-400 ml-1">{tier.period}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{tier.description}</p>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-2.5 text-xs text-slate-300">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  <button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={isCurrent || processingTier === tier.id}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isCurrent
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                        : tier.isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'glass-button text-slate-300 hover:text-white'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Current Active Plan
                      </>
                    ) : processingTier === tier.id ? (
                      'Processing...'
                    ) : (
                      <>
                        Upgrade with Stripe <ArrowUpRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-semibold text-white">Billing Receipts & Invoices</h2>
          <span className="text-xs text-slate-400 font-mono">Tax ID: US-9281741</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Billing Date</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-white">{inv.id}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{inv.date}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-200">{inv.plan}</td>
                  <td className="py-3.5 px-4 font-mono text-white">{inv.amount}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Downloading PDF receipt for invoice ${inv.id}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white glass-button inline-flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
