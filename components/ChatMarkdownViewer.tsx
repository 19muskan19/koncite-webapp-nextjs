'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMarkdownViewerProps {
  content: string;
  isDark?: boolean;
  role?: 'assistant' | 'user';
  className?: string;
}

/**
 * Renders AI chat messages with full markdown support for an optimal viewing experience.
 * Supports: bold, italic, code, code blocks, lists, links, headings, blockquotes, tables.
 */
export default function ChatMarkdownViewer({
  content,
  isDark = false,
  role = 'assistant',
  className = '',
}: ChatMarkdownViewerProps) {
  const isUser = role === 'user';

  const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    // Paragraphs - compact spacing in chat
    p: ({ children }) => (
      <span className="block [&+&]:mt-1.5">{children}</span>
    ),

    // Headings - scaled for chat context
    h1: ({ children }) => (
      <span className="block text-sm font-bold mt-2 first:mt-0 mb-0.5">{children}</span>
    ),
    h2: ({ children }) => (
      <span className="block text-xs font-bold mt-2 first:mt-0 mb-0.5">{children}</span>
    ),
    h3: ({ children }) => (
      <span className="block text-xs font-bold mt-1.5 first:mt-0 mb-0.5">{children}</span>
    ),

    // Inline code vs code blocks (pre wraps code with language-*)
    code: ({ className: codeClassName, children }) => {
      const isBlock = codeClassName?.includes('language-');
      if (isBlock) {
        return <code className="block py-0.5">{children}</code>;
      }
      return (
        <code
          className={`px-1 rounded font-mono text-[0.9em] ${
            isUser
              ? 'bg-white/20 text-white'
              : isDark
                ? 'bg-slate-600 text-[#C2D642]'
                : 'bg-slate-200 text-slate-800'
          }`}
        >
          {children}
        </code>
      );
    },

    // Code blocks
    pre: ({ children }) => (
      <pre
        className={`my-2 p-2 rounded-lg overflow-x-auto text-[0.85em] font-mono whitespace-pre-wrap ${
          isUser
            ? 'bg-white/20 text-white'
            : isDark
              ? 'bg-slate-800 text-slate-200 border border-slate-600'
              : 'bg-slate-200 text-slate-800 border border-slate-300'
        }`}
      >
        {children}
      </pre>
    ),

    // Lists - clean bullets/numbers
    ul: ({ children }) => (
      <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-tight">{children}</li>
    ),

    // Links - accent color, underline on hover
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline hover:opacity-80 transition-opacity ${
          isUser ? 'text-white' : 'text-[#C2D642]'
        }`}
      >
        {children}
      </a>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote
        className={`my-1.5 pl-3 border-l-2 ${
          isUser
            ? 'border-white/60 text-white/90'
            : isDark
              ? 'border-slate-500 text-slate-300'
              : 'border-slate-400 text-slate-600'
        }`}
      >
        {children}
      </blockquote>
    ),

    // Tables - simple grid
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table className="min-w-full border-collapse text-[0.9em]">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead>
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className={isDark ? 'border-b border-slate-600' : 'border-b border-slate-300'}>
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th
        className={`px-2 py-1 text-left font-bold ${
          isUser
            ? 'bg-white/20 text-white'
            : isDark
              ? 'bg-slate-700 text-slate-200'
              : 'bg-slate-100 text-slate-800'
        }`}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-2 py-1">
        {children}
      </td>
    ),

    // Horizontal rule
    hr: () => (
      <hr className={`my-2 ${isUser ? 'border-white/30' : isDark ? 'border-slate-600' : 'border-slate-300'}`} />
    ),

    // Strong and emphasis
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  };

  return (
    <div
      className={`break-words max-w-none [&_pre]:my-2 [&_pre]:p-2 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
