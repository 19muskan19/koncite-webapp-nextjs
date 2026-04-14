'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';

type Props = {
  content: string;
  isDark: boolean;
};

/**
 * Renders Ask me / copilot replies: markdown + GFM tables, lists, emphasis (matches AI Finance patterns).
 */
export default function CopilotChatMarkdown({ content, isDark }: Props) {
  const proseMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const proseBody = isDark ? 'text-slate-100' : 'text-slate-900';
  const borderSubtle = isDark ? 'border-white/[0.1]' : 'border-slate-200';

  const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    p: ({ children }) => (
      <p className={cn('text-[13px] sm:text-sm leading-relaxed mb-3 last:mb-0', proseBody)}>{children}</p>
    ),
    h1: ({ children }) => (
      <h2 className={cn('text-base font-black mt-4 first:mt-0 mb-2 tracking-tight', proseBody)}>{children}</h2>
    ),
    h2: ({ children }) => (
      <h3 className={cn('text-sm font-bold mt-4 first:mt-0 mb-2', proseBody)}>{children}</h3>
    ),
    h3: ({ children }) => (
      <h3 className={cn('text-xs font-black uppercase tracking-wider mt-4 first:mt-0 mb-2 text-[#C2D642]', proseBody)}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className={cn('text-xs font-bold mt-3 mb-1.5', proseMuted)}>{children}</h4>
    ),
    ul: ({ children }) => (
      <ul className={cn('my-2 ml-1 space-y-1.5 list-none pl-0 border-l-2 pl-3', borderSubtle)}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={cn('my-2 ml-1 space-y-1.5 list-decimal pl-4 marker:font-semibold', proseMuted)}>{children}</ol>
    ),
    li: ({ children }) => (
      <li className={cn('text-[13px] sm:text-sm leading-relaxed pl-0.5', proseBody)}>{children}</li>
    ),
    strong: ({ children }) => (
      <strong className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{children}</strong>
    ),
    em: ({ children }) => <em className="italic opacity-95">{children}</em>,
    hr: () => <hr className={cn('my-4 border-0 h-px', isDark ? 'bg-white/12' : 'bg-slate-200')} />,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          'my-3 pl-3 border-l-2 text-[13px] sm:text-sm',
          isDark ? 'border-[#C2D642]/45 text-slate-300' : 'border-[#C2D642] text-slate-700'
        )}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-semibold text-[#C2D642] underline underline-offset-2 hover:text-[#b8cc3c] break-all"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) return <code className="text-[0.85em]">{children}</code>;
      return (
        <code
          className={cn(
            'px-1 py-0.5 rounded text-[0.9em] font-mono font-semibold',
            isDark ? 'bg-white/[0.08] text-[#C2D642]' : 'bg-slate-200 text-slate-800'
          )}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          'my-2 p-3 rounded-xl text-[11px] sm:text-[12px] font-mono overflow-x-auto whitespace-pre-wrap border',
          isDark ? 'bg-[#0d1117] border-white/[0.08] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
        )}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div
        className={cn(
          'my-3 -mx-1 overflow-x-auto rounded-xl border shadow-sm',
          isDark ? 'border-slate-600/60 bg-slate-900/40' : 'border-slate-200 bg-white'
        )}
      >
        <table className={cn('w-full min-w-[280px] text-left text-[11px] sm:text-[12px]', proseBody)}>{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={cn('sticky top-0 z-[1]', isDark ? 'bg-slate-800/95' : 'bg-slate-100')}>{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className={cn(isDark ? '[&_tr:nth-child(even)]:bg-white/[0.03]' : '[&_tr:nth-child(even)]:bg-slate-50/80')}>
        {children}
      </tbody>
    ),
    th: ({ children }) => (
      <th
        className={cn(
          'px-2 sm:px-2.5 py-2 font-bold border-b text-left align-bottom',
          borderSubtle,
          proseMuted
        )}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={cn('px-2 sm:px-2.5 py-1.5 border-b align-top', borderSubtle, 'break-words')}>{children}</td>
    ),
  };

  return (
    <div className="copilot-md min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
