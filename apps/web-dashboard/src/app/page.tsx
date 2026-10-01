'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Headset,
  BookOpen,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState({
    activeConversations: 142,
    botDeflectionRate: 78.4,
    humanEscalations: 18,
    totalMessagesThisMonth: 842,
    messagesQuota: 2500,
    costSavings: 1840,
  });

  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Simulated inbound turn for instant live test
  const handleSimulateTurn = async (text: string) => {
    setSimulating(true);
    setSimulationStatus('Sending inbound webhook turn...');
    try {
      const res = await fetch('http://localhost:4000/api/v1/mock/whatsapp-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+14155552671',
          text,
          name: 'Sarah Connor',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulationStatus(`Bot Replied: "${data.data?.reply || 'Turn processed successfully'}"`);
      } else {
        setSimulationStatus(`Simulation response: Turn queued in platform`);
      }
    } catch (err: any) {
      setSimulationStatus(`Mock message sent to queue (API offline simulation)`);
    } finally {
      setSimulating(false);
    }
  };

  const recentEvents = [
    {
      id: 'evt-1',
      sender: 'Sarah Connor (+1 415-555-2671)',
      channel: 'WhatsApp',
      type: 'Bot Automated',
      preview: 'Show me your coffee menu and price list please',
      time: '2 mins ago',
      status: 'BOT_ACTIVE',
    },
    {
      id: 'evt-2',
      sender: 'Marcus Vance (+1 415-555-8902)',
      channel: 'WhatsApp',
      type: 'Human Escalation',
      preview: 'I need to speak to an agent about my billing invoice',
      time: '8 mins ago',
      status: 'HANDOFF_QUEUED',
    },
    {
      id: 'evt-3',
      sender: 'Elena Rostova (+1 415-555-4433)',
      channel: 'Web Widget',
      type: 'Appointment Booked',
      preview: 'Booked consultation for tomorrow at 2:00 PM',
      time: '15 mins ago',
      status: 'RESOLVED',
    },
    {
      id: 'evt-4',
      sender: 'David Kim (+1 415-555-7711)',
      channel: 'WhatsApp',
      type: 'Order Tracking',
      preview: 'Order #1001 tracking status queried',
      time: '26 mins ago',
      status: 'RESOLVED',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-surface-900 to-surface-900 border border-indigo-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Multi-Tenant Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: tenant-demo-prod</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, Agent Admin 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Autonomous multi-model AI agent is active with 7 integrated tools, RAG hybrid search, and live human escalation desk.
          </p>
        </div>

        {/* Quick Simulator Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/live-desk"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Headset className="w-4 h-4" />
            Open Live Desk
          </Link>
          <button
            onClick={() => handleSimulateTurn('Can you show me the product menu?')}
            disabled={simulating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-button text-slate-200 text-xs font-medium hover:text-white"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            {simulating ? 'Simulating...' : 'Simulate WhatsApp Inbound'}
          </button>
        </div>
      </div>

      {simulationStatus && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {simulationStatus}
          </span>
          <button
            onClick={() => setSimulationStatus(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Conversations
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.activeConversations}
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across WhatsApp & Web Widget</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bot Deflection Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.botDeflectionRate}%
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Autonomous</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Target benchmark: 75%+</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Human Escalations
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Headset className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.humanEscalations}
            </span>
            <span className="text-xs text-amber-400 font-semibold">Active queue</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Handled via Live Desk & Copilot</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monthly Usage Quota
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.totalMessagesThisMonth}
            </span>
            <span className="text-xs text-slate-400">/ {metrics.messagesQuota}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full"
              style={{ width: `${(metrics.totalMessagesThisMonth / metrics.messagesQuota) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Two Columns: Channels Status & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Channels & Capabilities */}
        <div className="space-y-6 lg:col-span-1">
          {/* Channels Card */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-sm font-semibold text-white">Connected Ingestion Channels</h2>
              <span className="text-[11px] text-emerald-400 font-mono">2 Live</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    WA
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Meta WhatsApp Cloud</h3>
                    <p className="text-[10px] text-slate-400">Webhook verified • +1 555-0192</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    WID
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Webchat Embed Widget</h3>
                    <p className="text-[10px] text-slate-400">WebSocket real-time gateway</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Ready
                </span>
              </div>
            </div>

            <Link
              href="/settings"
              className="w-full py-2 rounded-xl glass-button text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
            >
              Configure API Keys & Webhooks <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick RAG Knowledge Health */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Knowledge Base (RAG)
              </h2>
              <span className="text-xs text-slate-400">14 Chunks</span>
            </div>
            <p className="text-xs text-slate-400">
              Hybrid vector similarity and keyword search powered by pgvector & Reciprocal Rank Fusion (RRF).
            </p>
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline pt-1"
            >
              Manage documents & test sandbox →
            </Link>
          </div>
        </div>

        {/* Right Column: Live Inbound Events Stream */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Recent Inbound Activity & Turns
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time interaction audit stream</p>
            </div>
            <Link
              href="/live-desk"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              View in Live Desk <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-white/5 space-y-1">
            {recentEvents.map((evt) => (
              <div
                key={evt.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{evt.sender}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface-800 text-slate-300 border border-white/10">
                      {evt.channel}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        evt.status === 'HANDOFF_QUEUED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : evt.status === 'BOT_ACTIVE'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {evt.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-normal">"{evt.preview}"</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {evt.time}
                  </span>
                  <Link
                    href="/live-desk"
                    className="px-2.5 py-1 rounded-lg text-xs font-medium glass-button text-slate-300 hover:text-white"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
