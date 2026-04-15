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
 * Renders AI Finance assistant markdown: readable typography, spacing, and structure
 * (reference: narrative bubble above the Confirm & Save card).
 */
export default function FinanceChatMarkdown({ content, isDark }: Props) {
  const proseMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const proseBody = isDark ? 'text-slate-100' : 'text-slate-900';
  const borderSubtle = isDark ? 'border-white/[0.08]' : 'border-slate-200';

  const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    p: ({ children }) => <p className={cn('text-[13px] sm:text-sm leading-relaxed mb-3 last:mb-0', proseBody)}>{children}</p>,
    h1: ({ children }) => (
      <h3 className={cn('text-sm font-black mt-4 first:mt-0 mb-2 tracking-tight', proseBody)}>{children}</h3>
    ),
    h2: ({ children }) => (
      <h3 className={cn('text-[13px] font-bold mt-3 first:mt-0 mb-2', proseBody)}>{children}</h3>
    ),
    h3: ({ children }) => (
      <h3 className={cn('text-xs font-black uppercase tracking-wider mt-4 first:mt-0 mb-2 text-[#C2D642]', proseBody)}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className={cn('text-xs font-bold mt-2 mb-1.5', proseMuted)}>{children}</h4>
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
    hr: () => <hr className={cn('my-4 border-0 h-px', isDark ? 'bg-white/10' : 'bg-slate-200')} />,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          'my-3 pl-3 border-l-2 text-[13px] sm:text-sm italic',
          isDark ? 'border-[#C2D642]/50 text-slate-300' : 'border-[#C2D642] text-slate-700'
        )}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-semibold text-[#C2D642] underline underline-offset-2 hover:text-[#b8cc3c]"
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
          'my-2 p-3 rounded-xl text-[12px] font-mono overflow-x-auto whitespace-pre-wrap border',
          isDark ? 'bg-[#141414] border-white/[0.06] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
        )}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-inherit">
        <table className={cn('w-full text-left text-[12px] sm:text-[13px]', proseBody)}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className={cn(isDark ? 'bg-white/[0.06]' : 'bg-slate-100')}>{children}</thead>,
    th: ({ children }) => (
      <th className={cn('px-2 py-1.5 font-bold border-b', borderSubtle, proseMuted)}>{children}</th>
    ),
    td: ({ children }) => <td className={cn('px-2 py-1.5 border-b align-top', borderSubtle)}>{children}</td>,
  };

  return (
    <div className="finance-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
