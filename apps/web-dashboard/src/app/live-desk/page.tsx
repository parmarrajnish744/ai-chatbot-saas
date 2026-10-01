'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bot,
  UserCheck,
  Send,
  Sparkles,
  Headset,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  Radio,
  Smile,
  Shield,
  Phone,
  Mail,
  User,
  Tag,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useLiveDeskWS } from '@/lib/use-live-desk-ws';

interface ConversationItem {
  id: string;
  customerName: string;
  phone: string;
  channel: string;
  status: 'BOT_ACTIVE' | 'HANDOFF_QUEUED' | 'AGENT_ACTIVE' | 'RESOLVED';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
}

interface MessageItem {
  id: string;
  senderType: 'CUSTOMER' | 'BOT' | 'AGENT' | 'NOTE';
  senderName?: string;
  text: string;
  time: string;
  toolInvoked?: string;
}

export default function LiveDeskPage() {
  const [filter, setFilter] = useState<string>('ALL');
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: 'conv-101',
      customerName: 'Marcus Vance',
      phone: '+1 415-555-8902',
      channel: 'WhatsApp',
      status: 'HANDOFF_QUEUED',
      lastMessage: 'I need to speak to a human representative about my invoice discount.',
      lastMessageAt: 'Just now',
      unreadCount: 1,
    },
    {
      id: 'conv-102',
      customerName: 'Sarah Connor',
      phone: '+1 415-555-2671',
      channel: 'WhatsApp',
      status: 'BOT_ACTIVE',
      lastMessage: 'What are your weekend opening hours?',
      lastMessageAt: '4m ago',
    },
    {
      id: 'conv-103',
      customerName: 'Elena Rostova',
      phone: '+1 415-555-4433',
      channel: 'Webchat',
      status: 'AGENT_ACTIVE',
      lastMessage: 'Thank you, that clarifies the consultation fee!',
      lastMessageAt: '12m ago',
    },
    {
      id: 'conv-104',
      customerName: 'David Kim',
      phone: '+1 415-555-7711',
      channel: 'WhatsApp',
      status: 'RESOLVED',
      lastMessage: 'Order #1001 tracking status resolved.',
      lastMessageAt: '1h ago',
    },
  ]);

  const [activeConvId, setActiveConvId] = useState<string>('conv-101');
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>({
    'conv-101': [
      {
        id: 'm1',
        senderType: 'CUSTOMER',
        text: 'Hi, I received my invoice for the Pro plan but the coupon was not applied.',
        time: '10:32 AM',
      },
      {
        id: 'm2',
        senderType: 'BOT',
        text: 'I can certainly check billing policies for you. However, since this involves custom invoice adjustments, would you like me to connect you with our billing specialist?',
        time: '10:32 AM',
        toolInvoked: 'search_knowledge_base',
      },
      {
        id: 'm3',
        senderType: 'CUSTOMER',
        text: 'I need to speak to a human representative about my invoice discount.',
        time: '10:33 AM',
      },
      {
        id: 'm4',
        senderType: 'BOT',
        text: 'I have forwarded your request to our team. A team member will join this conversation shortly!',
        time: '10:33 AM',
        toolInvoked: 'transfer_to_human',
      },
    ],
    'conv-102': [
      {
        id: 'm201',
        senderType: 'CUSTOMER',
        text: 'What are your weekend opening hours?',
        time: '10:20 AM',
      },
      {
        id: 'm202',
        senderType: 'BOT',
        text: 'We are open on Saturdays from 9:00 AM to 6:00 PM and Sundays from 10:00 AM to 4:00 PM. How else may I assist you today?',
        time: '10:20 AM',
        toolInvoked: 'search_knowledge_base',
      },
    ],
  });

  const [inputMode, setInputMode] = useState<'REPLY' | 'NOTE'>('REPLY');
  const [inputText, setInputText] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotSummary, setCopilotSummary] = useState<{
    summary: string;
    sentiment: 'positive' | 'neutral' | 'frustrated';
    intent: string;
  } | null>(null);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [suggestTone, setSuggestTone] = useState<'friendly' | 'formal'>('friendly');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket real-time subscription
  const { isConnected, sendAction } = useLiveDeskWS({
    activeConversationId: activeConvId,
    onEvent: (event) => {
      if (event.event === 'new_message' && event.payload?.conversationId) {
        const { conversationId, message } = event.payload;
        setMessages((prev) => ({
          ...prev,
          [conversationId]: [
            ...(prev[conversationId] || []),
            {
              id: 'ws_' + Date.now(),
              senderType: message.senderType,
              text: message.text || message.content?.text || '',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }));
      }
    },
  });

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeMessages = messages[activeConvId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Actions
  const handleTakeOver = () => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, status: 'AGENT_ACTIVE' } : c))
    );
    apiClient.takeoverConversation(activeConvId);
  };

  const handleResolve = () => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, status: 'RESOLVED' } : c))
    );
    apiClient.resolveConversation(activeConvId);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: MessageItem = {
      id: 'm_' + Date.now(),
      senderType: inputMode === 'NOTE' ? 'NOTE' : 'AGENT',
      senderName: inputMode === 'NOTE' ? 'Private Note (Admin)' : 'Agent Admin',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));

    if (inputMode === 'NOTE') {
      apiClient.addInternalNote(activeConvId, inputText);
    } else {
      apiClient.sendAgentMessage(activeConvId, inputText);
    }

    setInputText('');
  };

  const handleFetchCopilotSummary = async () => {
    setCopilotLoading(true);
    try {
      const res = await apiClient.getCopilotSummary(activeConvId);
      if (res.success && res.data) {
        setCopilotSummary(res.data);
      } else {
        setCopilotSummary({
          summary: 'Customer reached out inquiring about promotional discount code missing on invoice #1001. Escalated from bot to live agent.',
          sentiment: 'neutral',
          intent: 'Invoice Billing Query',
        });
      }
    } catch (e) {
      setCopilotSummary({
        summary: 'Customer has requested human assistance for invoice review.',
        sentiment: 'neutral',
        intent: 'Billing Query',
      });
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleFetchCopilotReplies = async (tone: 'friendly' | 'formal') => {
    setSuggestTone(tone);
    try {
      const res = await apiClient.getCopilotSuggestedReply(activeConvId, tone);
      if (res.success && res.data) {
        setSuggestedReplies(res.data.quickOptions || [res.data.suggestedText]);
      } else {
        setSuggestedReplies(
          tone === 'formal'
            ? [
                'Good day Marcus, thank you for your patience. I am reviewing your account and will adjust the invoice immediately.',
                'Certainly, allow me 2 minutes to inspect your promotional code and issue an updated billing receipt.',
              ]
            : [
                'Hi Marcus! Thanks for waiting 😊 I can check that coupon code right now and credit the difference for you!',
                'Hey there! No worries at all, let me fix your invoice right away for you.',
              ]
        );
      }
    } catch (e) {
      setSuggestedReplies([
        'Hello! I am happy to help you with your invoice adjustments right away.',
      ]);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'ALL') return true;
    if (filter === 'QUEUED') return c.status === 'HANDOFF_QUEUED';
    if (filter === 'ACTIVE') return c.status === 'AGENT_ACTIVE';
    if (filter === 'BOT') return c.status === 'BOT_ACTIVE';
    if (filter === 'RESOLVED') return c.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-4">
      {/* Top Banner with WebSocket connectivity pill */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Headset className="w-5 h-5 text-indigo-400" />
            Live Human Escalation Desk
          </h1>
          <p className="text-xs text-slate-400">
            Real-time human-in-the-loop chat stream with AI Copilot assistance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
            <span>{isConnected ? 'WebSocket Stream: LIVE' : 'WS Reconnecting...'}</span>
          </div>
        </div>
      </div>

      {/* 3-Pane Workspace Container */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        {/* PANE 1: Conversation / Queue List (Col 3) */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 glass-panel rounded-2xl flex flex-col overflow-hidden">
          {/* Filter Tabs */}
          <div className="p-3 border-b border-white/10 space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'QUEUED', label: 'Escalated' },
                { key: 'ACTIVE', label: 'Agent' },
                { key: 'BOT', label: 'Bot' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                    filter === tab.key
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
            {filteredConversations.map((item) => {
              const isSelected = item.id === activeConvId;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveConvId(item.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                      {item.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.lastMessageAt}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-1">
                    {item.lastMessage}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.channel}
                    </span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider ${
                        item.status === 'HANDOFF_QUEUED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : item.status === 'AGENT_ACTIVE'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {item.status === 'HANDOFF_QUEUED' ? 'Needs Agent' : item.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PANE 2: Live Chat Stream (Col 6) */}
        <div className="col-span-12 md:col-span-8 lg:col-span-6 glass-panel rounded-2xl flex flex-col overflow-hidden">
          {/* Conversation Chat Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-900/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                {activeConv?.customerName.slice(0, 2).toUpperCase() || 'CU'}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  {activeConv?.customerName}
                  <span className="text-xs text-slate-400 font-normal">({activeConv?.phone})</span>
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Channel: {activeConv?.channel} • Status: {activeConv?.status}
                </p>
              </div>
            </div>

            {/* Take Over & Resolve Buttons */}
            <div className="flex items-center gap-2">
              {activeConv?.status !== 'AGENT_ACTIVE' ? (
                <button
                  onClick={handleTakeOver}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Take Over Chat
                </button>
              ) : (
                <button
                  onClick={handleResolve}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Resolve & Return to Bot
                </button>
              )}
            </div>
          </div>

          {/* Messages Stream Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-surface-950/40">
            {activeMessages.map((msg) => {
              const isCustomer = msg.senderType === 'CUSTOMER';
              const isBot = msg.senderType === 'BOT';
              const isNote = msg.senderType === 'NOTE';
              const isAgent = msg.senderType === 'AGENT';

              if (isNote) {
                return (
                  <div key={msg.id} className="p-3 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/30 my-2">
                    <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {msg.senderName || 'Internal Private Note'}
                      </span>
                      <span className="text-[10px] text-amber-400/80">{msg.time}</span>
                    </div>
                    <p className="text-xs text-amber-200/90">{msg.text}</p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    {isCustomer && <span>Customer</span>}
                    {isBot && (
                      <span className="flex items-center gap-1 text-indigo-400 font-medium">
                        <Bot className="w-3 h-3" /> Autonomous Bot
                        {msg.toolInvoked && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-[9px] font-mono text-cyan-300 border border-indigo-500/30">
                            ⚙ {msg.toolInvoked}
                          </span>
                        )}
                      </span>
                    )}
                    {isAgent && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <UserCheck className="w-3 h-3" /> Live Agent
                      </span>
                    )}
                    <span>• {msg.time}</span>
                  </div>

                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isCustomer
                        ? 'bg-surface-800 text-slate-100 border border-white/10 rounded-tl-sm'
                        : isBot
                        ? 'bg-indigo-950/60 text-indigo-100 border border-indigo-500/30 rounded-tr-sm'
                        : 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer Bottom Bar */}
          <div className="p-3 border-t border-white/10 bg-surface-900/60 space-y-2">
            {/* Mode Selector */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode('REPLY')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    inputMode === 'REPLY'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white glass-button'
                  }`}
                >
                  Reply to Customer
                </button>
                <button
                  onClick={() => setInputMode('NOTE')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    inputMode === 'NOTE'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white glass-button'
                  }`}
                >
                  Internal Note (Private)
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                Press Enter to send
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder={
                  inputMode === 'NOTE'
                    ? 'Write a private note only agents can see...'
                    : 'Type a message to Marcus Vance...'
                }
                className="flex-1 bg-surface-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* PANE 3: AI Copilot & Customer Profile (Col 3) */}
        <div className="col-span-12 lg:col-span-3 glass-panel rounded-2xl flex flex-col p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI Copilot Assistant
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              Live
            </span>
          </div>

          {/* AI Thread Summary */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Thread Intelligence</span>
              <button
                onClick={handleFetchCopilotSummary}
                disabled={copilotLoading}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                {copilotLoading ? 'Analyzing...' : 'Summarize'}
              </button>
            </div>

            {copilotSummary ? (
              <div className="p-3 rounded-xl bg-surface-900/80 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Intent:</span>
                  <span className="font-semibold text-white">{copilotSummary.intent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Sentiment:</span>
                  <span
                    className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                      copilotSummary.sentiment === 'frustrated'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {copilotSummary.sentiment}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 pt-1 border-t border-white/5 leading-relaxed">
                  {copilotSummary.summary}
                </p>
              </div>
            ) : (
              <button
                onClick={handleFetchCopilotSummary}
                className="w-full py-3 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-xs text-indigo-300 flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Click to generate thread summary
              </button>
            )}
          </div>

          {/* AI Suggested Replies */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Suggested Replies</span>
              <div className="flex gap-1 text-[10px]">
                <button
                  onClick={() => handleFetchCopilotReplies('friendly')}
                  className={`px-1.5 py-0.5 rounded ${suggestTone === 'friendly' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  Friendly
                </button>
                <button
                  onClick={() => handleFetchCopilotReplies('formal')}
                  className={`px-1.5 py-0.5 rounded ${suggestTone === 'formal' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  Formal
                </button>
              </div>
            </div>

            {suggestedReplies.length > 0 ? (
              <div className="space-y-2">
                {suggestedReplies.map((replyText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputMode('REPLY');
                      setInputText(replyText);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-surface-900/60 hover:bg-indigo-950/40 border border-white/5 hover:border-indigo-500/40 text-[11px] text-slate-200 transition-all leading-snug group"
                  >
                    <p className="group-hover:text-indigo-200">"{replyText}"</p>
                    <span className="text-[9px] text-indigo-400 block mt-1 font-semibold">
                      1-click to paste in chat ↵
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => handleFetchCopilotReplies('friendly')}
                className="w-full py-2.5 rounded-xl glass-button text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
              >
                <Smile className="w-3.5 h-3.5 text-emerald-400" />
                Generate suggestions
              </button>
            )}
          </div>

          {/* Customer CRM Mini-Profile */}
          <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
            <span className="font-semibold text-white block">CRM Profile</span>
            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{activeConv?.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{activeConv?.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                  Stage: Qualified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
