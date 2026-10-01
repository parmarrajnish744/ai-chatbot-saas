'use client';

import { Bell, Search, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b border-white/10 glass-panel sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Search / Context bar */}
      <div className="flex items-center gap-4">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations, knowledge, contacts..."
            className="w-full bg-surface-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-900/60 border border-white/5 text-xs text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tenant: <strong className="text-white font-mono">tenant-demo-prod</strong></span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick status pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 status-dot-active" />
          <span className="font-medium text-[11px]">LLM ReAct Engine Active</span>
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-xl text-slate-400 hover:text-white glass-button relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5" />
        </button>

        {/* Agent Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-xs text-white shadow-md">
            AD
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">Agent Admin</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <UserCheck className="w-2.5 h-2.5 text-indigo-400" /> Online
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
