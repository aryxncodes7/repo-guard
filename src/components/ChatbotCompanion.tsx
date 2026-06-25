/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getSafeHref } from '../utils';
import { CodeIssue, FinalSummary } from '../types';

interface ChatbotCompanionProps {
  activeReportContext?: {
    repoUrl: string;
    verdict: FinalSummary['verdict'];
    issues: CodeIssue[];
  };
}

type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 'initial',
  sender: 'assistant',
  text: "Hello! I am RepoGuard's Resident Auditor. Ask me about your security scan results, fixing plain-text secrets, resolving vulnerabilities, or modifying repository code structures."
};

const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

const markdownComponents = {
  p: ({ children, node, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { node?: unknown }) => <p className="mb-1.5 last:mb-0 leading-relaxed" {...props}>{children}</p>,
  ul: ({ children, node, ...props }: React.HTMLAttributes<HTMLUListElement> & { node?: unknown }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5" {...props}>{children}</ul>,
  ol: ({ children, node, ...props }: React.HTMLAttributes<HTMLOListElement> & { node?: unknown }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5" {...props}>{children}</ol>,
  li: ({ children, node, ...props }: React.HTMLAttributes<HTMLLIElement> & { node?: unknown }) => <li className="mb-0.5" {...props}>{children}</li>,
  strong: ({ children, node, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => <strong className="font-bold text-slate-900 dark:text-white" {...props}>{children}</strong>,
  a: ({ children, href, node, siblingIndex, index, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown; siblingIndex?: unknown; index?: unknown }) => {
    const safeUrl = getSafeHref(href);
    if (!safeUrl) {
      return <span className="text-emerald-600 dark:text-emerald-400 font-semibold" {...props}>{children}</span>;
    }
    const isExternal = safeUrl.startsWith('http') || safeUrl.startsWith('//');
    return (
      <a href={safeUrl} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold" {...props}>
        {children}
      </a>
    );
  },
  code: ({ inline, className, children, node, siblingIndex, index, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; node?: unknown; siblingIndex?: number; index?: number }) => {
    const codeString = String(children || '').replace(/\n$/, '');
    const isInline = typeof inline === 'boolean' ? inline : !codeString.includes('\n');
    return isInline ? (
      <code className={className || "bg-slate-100 dark:bg-zinc-700/60 px-1 py-0.5 rounded text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400"} {...props}>
        {codeString}
      </code>
    ) : (
      <pre className="bg-slate-950 text-slate-100 p-2.5 rounded-lg text-[10px] font-sans overflow-x-auto my-1.5 border border-slate-800 w-full whitespace-pre-wrap break-all">
        <code className={`block ${className || ''}`} {...props}>{codeString}</code>
      </pre>
    );
  }
};

export default function ChatbotCompanion({ activeReportContext }: ChatbotCompanionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // If there is context and the chat just opened, we can customize the greeting
  const repoUrl = activeReportContext?.repoUrl;
  const prevRepoUrlRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (repoUrl && repoUrl !== prevRepoUrlRef.current) {
      prevRepoUrlRef.current = repoUrl;
      const shortName = repoUrl.replace(/https?:\/\/(www\.)?github\.com\//, '') || 'this repository';
      setMessages([
        INITIAL_MESSAGE,
        { 
          id: generateId(),
          sender: 'assistant', 
          text: `I've loaded the security context for ${shortName}. Ask me anything about the identified vulnerabilities, files scanned, or recommended resolution guides!` 
        }
      ]);
    }
  }, [repoUrl]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    const safeUserMsg = input;
    setInput('');
    setMessages(prev => [...prev, { id: generateId(), sender: 'user', text: safeUserMsg }]);
    setIsTyping(true);

    try {
      // Clean up messages format for backend history
      const formattedHistory = messages.slice(-20).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: String(msg.text).trim().slice(0, 4000)
      }));

      let finalMessage = String(safeUserMsg).trim().slice(0, 4000);
      
      const chatHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const customApiKey = sessionStorage.getItem('repoguard-gemini-key');
      if (customApiKey) {
        chatHeaders['x-api-key'] = customApiKey;
      }

      let reportContextBody: any = undefined;

      if (activeReportContext) {
        const cleanRepoUrl = String(activeReportContext.repoUrl || '');
        const cleanVerdict = String(activeReportContext.verdict || '');
        const cleanIssues = Array.isArray(activeReportContext.issues)
          ? activeReportContext.issues.map((issue) => String(issue?.message || '')).filter(Boolean)
          : [];

        reportContextBody = {
          repository: cleanRepoUrl,
          verdict: cleanVerdict,
          issues: cleanIssues,
          guide: cleanVerdict === 'request_changes' ? 'Wipe secrets using BFG Repo Cleaner or rotate keys.' : 'None.'
        };
      }

      const requestBody: any = { message: finalMessage, history: formattedHistory };
      if (reportContextBody) {
        requestBody.reportContext = reportContextBody;
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify(requestBody),
        mode: 'cors',
        signal: abortControllerRef.current.signal
      });
      const contentType = response.headers.get("content-type");
      let data: any = null;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }
      if (!response.ok) {
        throw new Error(data?.message || `HTTP Error: ${response.status}`);
      }
      if (!data) {
        throw new Error("Invalid content type");
      }
      
      if (data.status === 'success') {
        setMessages(prev => [...prev, { id: generateId(), sender: 'assistant', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: generateId(), sender: 'assistant', text: data.message || "I ran into a minor connection problem. Please confirm your local API server configuration is running." }]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errorMessage = err?.message || 'Network offline';
      setMessages(prev => [...prev, { id: generateId(), sender: 'assistant', text: `Backend Error: ${errorMessage}. Please retry in a few moments.` }]);
    } finally {
      if (abortControllerRef.current === currentController) {
        setIsTyping(false);
      }
    }
  };

  return (
    <section
      className="flex flex-col h-[400px] lg:h-[450px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all relative w-full font-sans"
      aria-label="AI Security Companion chat"
    >
      <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold font-sans text-slate-800 dark:text-zinc-200 block">AI Security Companion</span>
            <span className="text-[9px] font-sans text-emerald-600 dark:text-emerald-400 uppercase font-extrabold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live Auditor Connected
            </span>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setMessages([{ id: generateId(), sender: 'assistant', text: "Conversational logs purged. Ready for new security inquiries!" }])}
          className="p-1 px-2 text-[10px] bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 rounded-lg border border-slate-200 dark:border-zinc-700 transition font-bold"
          title="Clear Chat Logs"
          aria-label="Clear chat logs"
        >
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 dark:bg-zinc-950/20"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed font-sans ${
              m.sender === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 rounded-bl-none shadow-sm'
            }`}>
              {m.sender === 'user' ? (
                m.text
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown
                    components={markdownComponents}
                    urlTransform={getSafeHref}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start" role="status" aria-label="Assistant is typing">
            <div className="bg-white dark:bg-zinc-800 text-slate-500 border border-slate-200/85 dark:border-zinc-700 rounded-xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex gap-2">
        <label htmlFor="security-chat-input" className="sr-only">Type message to AI Security Companion</label>
        <input
          id="security-chat-input"
          type="text"
          value={input}
          maxLength={4000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type message..."
          className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-zinc-800 dark:text-zinc-200 placeholder-slate-400 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-sans focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-2 aspect-square rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition flex items-center justify-center cursor-pointer"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </section>
  );
}
