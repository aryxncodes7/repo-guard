/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface MarkdownLiteProps {
  text: string;
}

export default function MarkdownLite({ text }: MarkdownLiteProps) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-slate-800 dark:text-zinc-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Skip completely empty lines
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Handle Bullet points starting with "- " or "* " or "+ "
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ');
        const cleanLine = isBullet ? trimmed.substring(2) : trimmed;

        // Parse bold elements **bold**
        const boldParts = cleanLine.split('**');
        const renderedContent = boldParts.map((part, i) => {
          if (i % 2 === 1) {
            return (
              <strong key={i} className="font-semibold text-teal-700 dark:text-teal-400 tracking-normal">
                {part}
              </strong>
            );
          }
          
          // Parse inline backticks `code`
          const codeParts = part.split('`');
          return codeParts.map((cPart, cI) => {
            if (cI % 2 === 1) {
              return (
                <code key={cI} className="px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded font-mono text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                  {cPart}
                </code>
              );
            }
            return cPart;
          });
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1 translate-x-1">
              <span className="text-teal-500 dark:text-teal-400 font-bold text-xs mt-1 select-none" aria-hidden="true">&bull;</span>
              <span className="flex-1 text-[13px] text-slate-700 dark:text-zinc-300">{renderedContent}</span>
            </div>
          );
        }

        // Handle Headers e.g. "### Key Verification"
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs font-bold tracking-wider text-slate-900 dark:text-zinc-100 mt-6 mb-2 uppercase font-sans border-b border-slate-200/60 dark:border-zinc-800 pb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-teal-500 dark:bg-teal-400 rounded-full" />
              {trimmed.substring(4)}
            </h4>
          );
        }

        return (
          <p key={idx} className="text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed">
            {renderedContent}
          </p>
        );
      })}
    </div>
  );
}
