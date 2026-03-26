'use client';

import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { ThemeType } from '@/types';
import { splitDescriptionAndStatusComments } from './statusUpdateDescription';

interface TaskCommentsBlockProps {
  description: string | undefined;
  theme: ThemeType;
  /** list: bordered stack; compact: tighter; modal: below form fields */
  variant?: 'list' | 'compact' | 'modal';
  /** Max comments to show in list/compact (rest summarized). 0 = all */
  maxVisible?: number;
  className?: string;
}

export function TaskCommentsBlock({
  description,
  theme,
  variant = 'list',
  maxVisible = 0,
  className = '',
}: TaskCommentsBlockProps) {
  const isDark = theme === 'dark';
  const { comments } = splitDescriptionAndStatusComments(description);
  if (comments.length === 0) return null;

  const show = maxVisible > 0 ? comments.slice(-maxVisible) : comments;
  const hidden = maxVisible > 0 ? Math.max(0, comments.length - maxVisible) : 0;

  const card =
    variant === 'compact'
      ? isDark
        ? 'rounded-md border border-slate-600/80 bg-slate-800/40 px-2 py-1.5'
        : 'rounded-md border border-slate-200 bg-slate-100/80 px-2 py-1.5'
      : variant === 'modal'
        ? isDark
          ? 'rounded-lg border border-slate-600 bg-slate-800/40 p-3'
          : 'rounded-lg border border-slate-200 bg-slate-50 p-3'
        : isDark
          ? 'rounded-lg border border-slate-600/90 bg-slate-900/40 p-2.5'
          : 'rounded-lg border border-slate-200 bg-slate-50/90 p-2.5';

  const labelCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const textCls = isDark ? 'text-slate-200' : 'text-slate-800';
  const titleCls = isDark ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className={className}>
      <div className={`flex items-center gap-1.5 mb-1.5 ${variant === 'compact' ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wider ${labelCls}`}>
        <MessageSquareText className={variant === 'compact' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden />
        Comments {comments.length > 1 ? `(${comments.length})` : ''}
      </div>
      {hidden > 0 && (
        <p className={`text-[10px] mb-1.5 ${labelCls}`}>
          Showing last {show.length}. {hidden} earlier in full description.
        </p>
      )}
      <ul className={`space-y-2 ${variant === 'compact' ? 'space-y-1.5' : ''}`}>
        {show.map((c, i) => (
          <li key={`${c.label}-${i}`} className={card}>
            <div className={`text-[10px] font-medium mb-0.5 ${titleCls}`}>{c.label}</div>
            <div className={`${variant === 'compact' ? 'text-[10px]' : 'text-xs'} whitespace-pre-wrap break-words ${textCls}`}>{c.text}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
