'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Headset,
  BookOpen,
  Kanban,
  Bot,
  CreditCard,
  Sparkles,
  Radio,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Live Desk', href: '/live-desk', icon: Headset, badge: 'Realtime' },
  { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { name: 'CRM Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Bot Settings', href: '/settings', icon: Bot },
  { name: 'Billing & Quota', href: '/billing', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-white/10 flex flex-col justify-between">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
              OmniBot <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">SaaS</span>
            </span>
            <p className="text-[11px] text-slate-400 leading-none">AI Agent Platform</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/10 text-white border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & System Status */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="p-3 rounded-xl bg-surface-900/80 border border-white/5 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Engine Online
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">99.98%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <span className="truncate max-w-[120px] font-mono text-[11px] text-slate-400">demo-tenant</span>
          <span className="text-[11px] text-indigo-400 font-semibold">Pro Tier</span>
        </div>
      </div>
    </aside>
  );
}
