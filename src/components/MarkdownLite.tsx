/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';
import { getSafeHref, ALLOWED_PROTOCOLS } from '../utils';

interface MarkdownLiteProps {
  text: string;
}

const HEADING_TAGS: Record<1 | 2 | 3 | 4 | 5 | 6, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'> = {
  1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6'
};

const HEADING_STYLES: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'text-lg text-slate-800 dark:text-zinc-100 font-bold mt-5 mb-2.5',
  2: 'text-base text-slate-800 dark:text-zinc-100 font-bold mt-4 mb-2',
  3: 'text-sm text-slate-700 dark:text-zinc-200 font-bold mt-3 mb-1.5',
  4: 'text-xs text-slate-600 dark:text-zinc-300 font-bold mt-2 mb-1 uppercase tracking-wide',
  5: 'text-[11px] text-slate-500 dark:text-zinc-400 font-bold mt-2 mb-1 uppercase tracking-wider',
  6: 'text-[10px] text-slate-400 dark:text-zinc-500 font-bold mt-1.5 mb-1 uppercase tracking-widest'
};

const HeadingComponent = ({ children, level, node, siblingIndex, index, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { level: 1 | 2 | 3 | 4 | 5 | 6; node?: unknown; siblingIndex?: unknown; index?: unknown }) => {
  const Tag = HEADING_TAGS[level] || 'h4';
  const sizeClass = HEADING_STYLES[level] || 'text-xs';
  return (
    <Tag className={`${sizeClass} font-sans`}>
      {children}
    </Tag>
  );
};

const markdownComponents = {
  p: ({ children, node, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { node?: unknown }) => (
    <p className="text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed mb-2 last:mb-0">
      {children}
    </p>
  ),
  h1: (props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => <HeadingComponent level={1} {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => <HeadingComponent level={2} {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => <HeadingComponent level={3} {...props} />,
  h4: (props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => <HeadingComponent level={4} {...props} />,
  h5: (props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => <HeadingComponent level={5} {...props} />,
  h6: (props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => <HeadingComponent level={6} {...props} />,
  strong: ({ children, node, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => (
    <strong className="font-semibold text-teal-700 dark:text-teal-400 tracking-normal">
      {children}
    </strong>
  ),
  ul: ({ children, node, ...props }: React.HTMLAttributes<HTMLUListElement> & { node?: unknown }) => (
    <ul className="list-disc pl-4 space-y-1.5 my-2">
      {children}
    </ul>
  ),
  li: ({ children, node, ...props }: React.HTMLAttributes<HTMLLIElement> & { node?: unknown }) => (
    <li className="my-1 translate-x-1 marker:text-teal-500 dark:marker:text-teal-400 text-[13px] text-slate-700 dark:text-zinc-300">
      <span className="-ml-1">{children}</span>
    </li>
  ),
  a: ({ children, href, node, siblingIndex, index, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown; siblingIndex?: unknown; index?: unknown }) => {
    const safeUrl = getSafeHref(href);
    if (!safeUrl) {
      return <span className="text-teal-700 dark:text-teal-400 font-semibold">{children}</span>;
    }
    return (
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 dark:text-teal-400 hover:underline font-semibold">
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
  const safeText = React.useMemo(() => {
    const str = String(text);
    const truncated = str.length > 100000 ? str.slice(0, 100000) + '\n\n**[TRUNCATED: Output exceeded 100k characters]**' : str;
    const fragment = DOMPurify.sanitize(truncated, { RETURN_DOM_FRAGMENT: true });
    if (typeof fragment === 'string') return fragment;
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    return tempDiv.innerHTML;
  }, [text]);

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-slate-800 dark:text-zinc-200">
      <ReactMarkdown
        urlTransform={getSafeHref}
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, {
          tagNames: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'ul', 'li', 'a', 'code', 'pre', 'blockquote'],
          attributes: {
            'a': ['href'],
            'code': [['className', /^language-[a-zA-Z0-9_-]+$/]]
          },
          protocols: {
            href: [...ALLOWED_PROTOCOLS]
          },
          strip: ['script'],
          clobberPrefix: 'user-content-',
          clobber: ['name', 'id']
        }]]}
      >
        {safeText}
      </ReactMarkdown>
    </div>
  );
}
