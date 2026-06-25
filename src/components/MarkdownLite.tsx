/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { getSafeHref } from '../utils';

interface MarkdownLiteProps {
  text: string;
}


const HeadingComponent = ({ children, level, node, siblingIndex, index, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { level: 1 | 2 | 3 | 4 | 5 | 6; node?: unknown; siblingIndex?: unknown; index?: unknown }) => {
  const headings: Record<1 | 2 | 3 | 4 | 5 | 6, keyof JSX.IntrinsicElements> = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' };
  const sizes: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: 'text-lg text-slate-800 dark:text-zinc-100 font-bold mt-5 mb-2.5',
    2: 'text-base text-slate-800 dark:text-zinc-100 font-bold mt-4 mb-2',
    3: 'text-sm text-slate-700 dark:text-zinc-200 font-bold mt-3 mb-1.5',
    4: 'text-xs text-slate-600 dark:text-zinc-300 font-bold mt-2 mb-1 uppercase tracking-wide',
    5: 'text-[11px] text-slate-500 dark:text-zinc-400 font-bold mt-2 mb-1 uppercase tracking-wider',
    6: 'text-[10px] text-slate-400 dark:text-zinc-500 font-bold mt-1.5 mb-1 uppercase tracking-widest'
  };
  const Tag = headings[level] || 'h4';
  const sizeClass = sizes[level] || 'text-xs';
  return (
    <Tag {...props} className={`${sizeClass} font-sans`}>
      {children}
    </Tag>
  );
};

const markdownComponents = {
  p: ({ children }: any) => (
    <p className="text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed mb-2 last:mb-0">
      {children}
    </p>
  ),
  h1: (props: any) => <HeadingComponent level={1} {...props} />,
  h2: (props: any) => <HeadingComponent level={2} {...props} />,
  h3: (props: any) => <HeadingComponent level={3} {...props} />,
  h4: (props: any) => <HeadingComponent level={4} {...props} />,
  strong: ({ children }: any) => (
    <strong className="font-semibold text-teal-700 dark:text-teal-400 tracking-normal">
      {children}
    </strong>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-1.5 my-2">
      {children}
    </ul>
  ),
  li: ({ children }: any) => (
    <li className="flex items-start gap-2.5 my-1 translate-x-1">
      <span className="text-teal-500 dark:text-teal-400 font-bold text-xs mt-1 select-none" aria-hidden="true">&bull;</span>
      <span className="flex-1 text-[13px] text-slate-700 dark:text-zinc-300">{children}</span>
    </li>
  ),
  a: ({ children, href, node, siblingIndex, index, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown; siblingIndex?: unknown; index?: unknown }) => {
    const safeUrl = getSafeHref(href);
    const isExternal = safeUrl?.startsWith('http') || safeUrl?.startsWith('//');
    return (
      <a href={safeUrl} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className="text-teal-700 dark:text-teal-400 hover:underline font-semibold">
        {children}
      </a>
    );
  },
  code: ({ inline, className, children, node, siblingIndex, index, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; node?: unknown; siblingIndex?: number; index?: number }) => {
    const codeString = String(children || '').replace(/\n$/, '');
    const isInline = typeof inline === 'boolean' ? inline : !codeString.includes('\n');
    return isInline ? (
      <code className={className || "px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded font-sans text-[11px] text-teal-700 dark:text-teal-400 font-semibold"}>
        {codeString}
      </code>
    ) : (
      <pre className="p-4 rounded-lg bg-slate-950 text-rose-300 font-sans text-[10.5px] overflow-x-auto whitespace-pre leading-normal border border-slate-800 shadow-inner w-full">
        <code className={`block ${className || ''}`}>{codeString}</code>
      </pre>
    );
  }
};

export default function MarkdownLite({ text }: MarkdownLiteProps) {
  if (!text) return null;

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-slate-800 dark:text-zinc-200">
      <ReactMarkdown
        urlTransform={getSafeHref}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
