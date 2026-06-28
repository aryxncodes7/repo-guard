/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface MarkdownLiteProps {
  text: string;
}

export default function MarkdownLite({ text }: MarkdownLiteProps) {
  if (!text) return null;

  const safeHtml = React.useMemo(() => {
    const str = String(text);
    const truncated = str.length > 100000 ? str.slice(0, 100000) + '\n\n**[TRUNCATED: Output exceeded 100k characters]**' : str;
    
    // Convert Markdown to HTML
    const rawHtml = marked.parse(truncated) as string;
    
    // explicit sanitization before rendering via dangerouslySetInnerHTML
    return DOMPurify.sanitize(rawHtml);
  }, [text]);

  return (
    <div 
      className="space-y-3.5 text-sm leading-relaxed text-slate-800 dark:text-zinc-200 markdown-content prose dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
