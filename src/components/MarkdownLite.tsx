/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownLiteProps {
  text: string;
}
const rawDomains = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS) || "";
const ALLOWED_EMAIL_DOMAINS = typeof rawDomains === 'string' ? rawDomains.split(",").map((d: string) => d.trim()).filter(Boolean) : [];

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

const HeadingComponent = ({ children, level, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { level: 1 | 2 | 3 | 4 }) => {
  const headings: Record<1 | 2 | 3 | 4, any> = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' };
  const Tag = headings[level] || 'h4';
  return (
    <Tag {...props} className="text-xs font-bold tracking-wider text-slate-900 dark:text-zinc-100 mt-6 mb-2 uppercase font-sans border-b border-slate-200/60 dark:border-zinc-800 pb-1 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-teal-500 dark:bg-teal-400 rounded-full" />
      {children}
    </Tag>
  );
};

export default function MarkdownLite({ text }: MarkdownLiteProps) {
  if (!text) return null;

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-slate-800 dark:text-zinc-200">
      <ReactMarkdown
        urlTransform={getSafeHref}
        components={{
          p: ({ children }) => (
            <p className="text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),
          h1: (props) => <HeadingComponent level={1} {...props} />,
          h2: (props) => <HeadingComponent level={2} {...props} />,
          h3: (props) => <HeadingComponent level={3} {...props} />,
          h4: (props) => <HeadingComponent level={4} {...props} />,
          strong: ({ children }) => (
            <strong className="font-semibold text-teal-700 dark:text-teal-400 tracking-normal">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <div className="space-y-1.5 my-2">
              {children}
            </div>
          ),
          li: ({ children }) => (
            <div className="flex items-start gap-2.5 my-1 translate-x-1">
              <span className="text-teal-500 dark:text-teal-400 font-bold text-xs mt-1 select-none" aria-hidden="true">&bull;</span>
              <span className="flex-1 text-[13px] text-slate-700 dark:text-zinc-300">{children}</span>
            </div>
          ),
          a: ({ children, href }) => (
            <a href={getSafeHref(href)} target="_blank" rel="noopener noreferrer" className="text-teal-700 dark:text-teal-400 hover:underline font-semibold">
              {children}
            </a>
          ),
          code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
            const codeString = String(children || '').replace(/\n$/, '');
            const isInline = !codeString.includes('\n');
            return isInline ? (
              <code className="px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded font-sans text-[11px] text-teal-700 dark:text-teal-400 font-semibold" {...props}>
                {codeString}
              </code>
            ) : (
              <pre className="p-4 rounded-lg bg-slate-950 text-rose-300 font-sans text-[10.5px] overflow-x-auto whitespace-pre leading-normal border border-slate-800 shadow-inner w-full">
                <code className="block" {...props}>{codeString}</code>
              </pre>
            );
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
