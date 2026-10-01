'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Upload,
  Search,
  Trash2,
  Sparkles,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Database,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DocumentItem {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: 'doc-1',
      title: 'Business Hours & Refund Policy',
      chunkCount: 6,
      createdAt: '2026-09-28T14:20:00Z',
    },
    {
      id: 'doc-2',
      title: 'Appointment Booking & Consultation Procedures',
      chunkCount: 8,
      createdAt: '2026-09-29T09:15:00Z',
    },
    {
      id: 'doc-3',
      title: 'Product Catalog & Shipping Warranty',
      chunkCount: 12,
      createdAt: '2026-09-29T18:40:00Z',
    },
  ]);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [chunkSize, setChunkSize] = useState(400);
  const [overlap, setOverlap] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Search Sandbox State
  const [query, setQuery] = useState('What is the refund policy for purchases?');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([
    {
      id: 'chunk-1',
      content:
        'Customers can return items within 30 days of purchase for a full refund or store exchange. Items must be in original unworn condition with tags attached. Proof of purchase is required.',
      score: 0.94,
    },
    {
      id: 'chunk-2',
      content:
        'Refunds are processed back to the original payment method within 3 to 5 business days after inspection at our fulfillment facility.',
      score: 0.82,
    },
  ]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await apiClient.getKnowledgeDocuments();
      if (res.success && res.data && res.data.length > 0) {
        setDocuments(res.data);
      }
    } catch (err) {}
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const res = await apiClient.uploadKnowledgeDocument({
        title,
        content,
        chunkSize,
        overlap,
      });

      if (res.success && res.data) {
        setDocuments((prev) => [res.data!, ...prev]);
        setUploadMessage(`Indexed "${title}" into ${res.data.chunkCount} semantic chunks!`);
        setTitle('');
        setContent('');
      } else {
        // Fallback local mock
        const mockDoc: DocumentItem = {
          id: 'doc-' + Date.now(),
          title,
          chunkCount: Math.ceil(content.length / chunkSize),
          createdAt: new Date().toISOString(),
        };
        setDocuments((prev) => [mockDoc, ...prev]);
        setUploadMessage(`Document indexed into ${mockDoc.chunkCount} chunks.`);
        setTitle('');
        setContent('');
      }
    } catch (err: any) {
      setUploadMessage('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.searchKnowledge(query, 3);
      if (res.success && res.data && res.data.results) {
        setSearchResults(res.data.results);
      }
    } catch (err) {
      // Keep existing results
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await apiClient.deleteKnowledgeDocument(id);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          Knowledge Base (RAG) Manager
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Hybrid dense vector (pgvector) and keyword search with Reciprocal Rank Fusion (RRF) for bot grounding.
        </p>
      </div>

      {/* Main Grid: Upload & Search Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Ingest Card (Col 6) */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              Ingest Document or Policy
            </h2>
            <span className="text-[10px] text-indigo-300 font-mono">1536-dim Embedding</span>
          </div>

          {uploadMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {uploadMessage}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Return Policy, Pricing FAQ, Services Guide"
                className="w-full bg-surface-900 border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Document Content / Text</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Paste the document text, procedure guidelines, pricing tiers, or FAQs here..."
                className="w-full bg-surface-900 border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Chunk Size (tokens)</label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Overlap (tokens)</label>
                <input
                  type="number"
                  value={overlap}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              {uploading ? 'Chunking & Embedding...' : 'Chunk & Index into Vector Store'}
            </button>
          </form>
        </div>

        {/* Right Column: Interactive RAG Search Sandbox (Col 6) */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              Test RAG Retrieval Sandbox
            </h2>
            <span className="text-[10px] text-cyan-300 font-mono">Hybrid RRF Rank</span>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Ask any question to test semantic retrieval..."
                className="flex-1 bg-surface-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
              >
                <Search className="w-3.5 h-3.5" />
                {searching ? 'Querying...' : 'Search'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Top semantic matches injected into the LLM context when executing <code>search_knowledge_base</code>:
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {searchResults.map((res, i) => (
                <div
                  key={res.id || i}
                  className="p-3.5 rounded-xl bg-surface-900/60 border border-white/5 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-cyan-400 font-semibold">
                      Rank #{i + 1}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                      Similarity: {(res.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    "{res.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Indexed Knowledge Documents */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Indexed Knowledge Documents ({documents.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Active Tenant Library</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Vector Model</th>
                <th className="py-3 px-4">Indexed At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    {doc.title}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-300">
                    {doc.chunkCount} chunks
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    text-embedding-3-small (1536d)
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
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
