/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { MessageSquare, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ALLOWED_EMAIL_DOMAINS } from '../utils';
import { CodeIssue, FinalSummary } from '../types';

interface ChatbotCompanionProps {
  activeReportContext?: {
    repoUrl: string;
    verdict: FinalSummary['verdict'];
    issues: CodeIssue[];
  };
}

type ChatMessage = {
  sender: 'user' | 'assistant';
  text: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  sender: 'assistant',
  text: "Hello! I am RepoGuard's Resident Auditor. Ask me about your security scan results, fixing plain-text secrets, resolving vulnerabilities, or modifying repository code structures."
};

function getSafeHref(href?: string) {
  if (!href) return undefined;
  try {
    const parsed = new URL(href, window.location.origin);
    if (parsed.protocol === 'mailto:') {
      const email = parsed.pathname.trim();
      const domain = email.split('@').pop()?.toLowerCase();
      if (!domain || !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        return undefined;
      }
      if (email.length > 254) {
        return undefined;
      }
      if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+$/.test(email)) {
        return undefined;
      }
      return `mailto:${email}`;
    }
    return ['http:', 'https:'].includes(parsed.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

export default function ChatbotCompanion({ activeReportContext }: ChatbotCompanionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // If there is context and the chat just opened, we can customize the greeting
  useEffect(() => {
    if (activeReportContext) {
      const shortName = activeReportContext.repoUrl?.replace(/https?:\/\/(www\.)?github\.com\//, '') || 'this repository';
      setMessages([
        { 
          sender: 'assistant', 
          text: `I've loaded the security context for ${shortName}. Ask me anything about the identified vulnerabilities, files scanned, or recommended resolution guides!` 
        }
      ]);
    }
  }, [activeReportContext]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const safeUserMsg = DOMPurify.sanitize(input);
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: safeUserMsg }]);
    setIsTyping(true);

    try {
      // Clean up messages format for backend history
      const formattedHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.text
      }));

      let finalMessage = safeUserMsg;
      
      const chatHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      let reportContextBody: any = undefined;

      if (activeReportContext && messages.length <= 2) {
        const sanitize = (val: string) => (val || '').replace(/[<>\x00-\x1F\x7F-\x9F`$\\]/g, '');
        const cleanRepoUrl = sanitize(activeReportContext.repoUrl);
        const cleanVerdict = sanitize(activeReportContext.verdict);
        const cleanIssues = activeReportContext.issues
          .map((issue) => sanitize(issue.message))
          .filter(Boolean);

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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'assistant', text: "I ran into a minor connection problem. Please confirm your local API server configuration is running." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'assistant', text: "Our backend audit network seems offline. Please retry in a few moments." }]);
    } finally {
      setIsTyping(false);
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
          onClick={() => setMessages([{ sender: 'assistant', text: "Conversational logs purged. Ready for new security inquiries!" }])}
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
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
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
                    components={{
                      p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>,
                      a: ({ children, href }) => (
                        <a href={getSafeHref(href)} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
                          {children}
                        </a>
                      ),
                      code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
                        const codeString = String(children || '').replace(/\n$/, '');
                        const isInline = !codeString.includes('\n');
                        return isInline ? (
                          <code className="bg-slate-100 dark:bg-zinc-700/60 px-1 py-0.5 rounded text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400" {...props}>
                            {codeString}
                          </code>
                        ) : (
                          <pre className="bg-slate-950 text-slate-100 p-2.5 rounded-lg text-[10px] font-sans overflow-x-auto my-1.5 border border-slate-800 w-full whitespace-pre-wrap break-all">
                            <code className="block" {...props}>{codeString}</code>
                          </pre>
                        );
                      }
                    }}
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
