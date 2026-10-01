import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OmniAgent AI | Omnichannel Chatbot SaaS Workspace',
  description: 'Autonomous AI Chatbot SaaS platform with Live Human Desk, ReAct Function Calling & RAG Knowledge Base.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-background text-slate-100 flex">
          <Sidebar />
          <div className="flex-1 flex flex-col pl-64 min-w-0">
            <Header />
            <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
