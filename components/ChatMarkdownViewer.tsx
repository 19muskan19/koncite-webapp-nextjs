'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Extract plain text from React node for heuristic checks */
function getTextFromNode(node: React.ReactNode): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getTextFromNode).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return getTextFromNode((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

/** Check if node tree contains nested ul/ol (avoids button-in-button) */
function hasNestedList(node: React.ReactNode): boolean {
  if (node == null) return false;
  if (Array.isArray(node)) return node.some(hasNestedList);
  if (React.isValidElement(node)) {
    const type = (node as React.ReactElement).type;
    if (type === 'ul' || type === 'ol') return true;
    const child = (node as React.ReactElement<{ children?: React.ReactNode }>).props?.children;
    return hasNestedList(child);
  }
  return false;
}

/** Check if line looks like a markdown table row (pipe-separated) */
function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && (t.match(/\|/g) || []).length >= 3;
}

/**
 * Converts pipe-separated comparison data into proper markdown tables.
 * When AI returns rows like | Report | Purpose | Data | Impact | Used By |, ensures correct table layout.
 */
function formatPipeTable(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!isTableRow(line)) {
      result.push(line);
      i++;
      continue;
    }
    const tableRows: string[] = [line];
    let j = i + 1;
    while (j < lines.length && isTableRow(lines[j])) {
      tableRows.push(lines[j]);
      j++;
    }
    if (tableRows.length >= 2) {
      const colCount = tableRows[0].split('|').map((s) => s.trim()).filter(Boolean).length;
      const separator = '|' + Array(colCount).fill('---').join('|') + '|';
      const hasSeparator = j < lines.length && /^\|[-:\s|]+\|$/.test(lines[j].trim());
      if (!hasSeparator) {
        result.push(tableRows[0]);
        result.push(separator);
        for (let r = 1; r < tableRows.length; r++) result.push(tableRows[r]);
      } else {
        tableRows.forEach((r) => result.push(r));
        result.push(lines[j]);
        j++;
      }
      i = j;
      continue;
    }
    result.push(line);
    i++;
  }
  return result.join('\n');
}

/**
 * Converts structured content (headings + sub-items) into proper markdown lists.
 * Uses bullets for item lists, numbers for sequential/flow content (e.g. "Opening → Inward → Closing").
 */
function formatStructuredLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;
  const sectionHeading = /^(What it includes|How the stock|Filters typically|Purpose of the report|Key data|Material name)/i;
  const nextSectionOrFollowUp = /^(What it includes|How the stock|Filters typically|Purpose of the report|Key data|If you want|Material name)/i;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') {
      result.push(line);
      i++;
      continue;
    }
    if (sectionHeading.test(trimmed) && i + 1 < lines.length) {
      result.push('\n**' + trimmed.replace(/\*\*/g, '') + '**\n');
      i++;
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i];
        const nTrim = next.trim();
        if (nTrim === '') {
          i++;
          break;
        }
        if (nextSectionOrFollowUp.test(nTrim) && items.length > 0) break;
        items.push(nTrim.replace(/^\s*[-•*]\s*/, ''));
        i++;
      }
      if (items.length > 0) {
        const useNumbers = items.some((it) => /→|=\s*Opening|=\s*Inward|Closing\s*=|Opening\s*\+|Inward\s*-\s*Outward/i.test(it));
        items.forEach((it, idx) => result.push(useNumbers ? `${idx + 1}. ${it}` : `- ${it}`));
        result.push('');
      }
      continue;
    }
    result.push(line);
    i++;
  }
  return result.join('\n');
}

/**
 * Enhances AI assistant responses: converts comma-separated lists into markdown bullet lists,
 * and formats structured content (headings + sub-items) with proper bullets/numbers.
 */
function enhanceAssistantResponse(content: string): string {
  let processed = formatPipeTable(content);
  processed = formatStructuredLists(processed);
  const lines = processed.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      result.push(line);
      i++;
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      result.push(line);
      i++;
      continue;
    }
    if (isTableRow(line)) {
      result.push(line);
      i++;
      continue;
    }
    if (/[?]$/.test(line.trim()) || /\([^)]*,[^)]*\)/.test(line) || /,\s*(or|and)\s+\w+\s*[.?]?\s*$/i.test(line.trim())) {
      result.push(line);
      i++;
      continue;
    }
    let block = line;
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (next.trim() === '') break;
      if (next.startsWith('- ') || next.startsWith('* ') || /^\d+\.\s/.test(next)) break;
      if (/^(If |You |I |We |To |For |Note:|Also,|Additionally,)/i.test(next.trim())) break;
      if (/[?]$/.test(next.trim()) || /\([^)]*,[^)]*\)/.test(next)) break;
      const hasCommas = (next.match(/,/g) || []).length >= 1;
      const isShortItemLine = next.trim().length < 100 && !/^[A-Z].*[.!?]\s*$/.test(next.trim());
      if (hasCommas && isShortItemLine && !/^(If |You |I |We |To |For )/i.test(next.trim())) {
        block += ' ' + next.trim();
        j++;
      } else if ((block.match(/,/g) || []).length >= 2 && next.trim().length < 60 && /^[\w\-.*\s,]+$/.test(next) && !next.includes('.') && !next.includes('?')) {
        block += ', ' + next.trim();
        j++;
      } else break;
    }
    const commaCount = (block.match(/,/g) || []).length;
    if (commaCount >= 2) {
      const normalized = block.replace(/\s*,\s*and\s+([^,]+)\s*\.?\s*$/i, ', $1');
      const items = normalized.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
      const looksLikeInlinePhrase = items.some((it) => it.length <= 3 || /^(or|and)\s/i.test(it)) || items.length > 8;
      if (items.length >= 2 && items.every((it) => it.length < 100) && !looksLikeInlinePhrase) {
        const bulletList = items.map((it) => '- ' + it).join('\n');
        result.push(bulletList);
        i = j;
        continue;
      }
    }
    result.push(line);
    i++;
  }
  return result.join('\n');
}

interface ChatMarkdownViewerProps {
  content: string;
  isDark?: boolean;
  role?: 'assistant' | 'user';
  className?: string;
  /** When provided, list items in assistant messages become clickable; clicking sends the option text */
  onOptionClick?: (optionText: string) => void;
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
  onOptionClick,
}: ChatMarkdownViewerProps) {
  const isUser = role === 'user';
  const makeListItemsClickable = !isUser && !!onOptionClick;
  const displayContent = !isUser ? enhanceAssistantResponse(content) : content;
  const isConfirmationContext = /please confirm|confirm which|confirm which ones|reply with one of|choose one of|pick one of|for example:/i.test(displayContent);
  const isFreeFormConfirmationContext = /reply yes or tell me|tell me the title|tell me the .* you prefer|confirm one last thing|do you want the .* as/i.test(displayContent);
  const isProjectSelectionContext = /available.*projects|Which project|project would you like|Here are the available/i.test(displayContent);
  const isSubprojectSelectionContext = /subprojects|Which subproject|subproject.*wing|wing.*section|section are you working/i.test(displayContent);
  const isDprAddContentContext = /what would you like to add|You can add|add to today's DPR|add to today|just tell me what you want to add first/i.test(displayContent);
  const isActivitiesListContext = /all the activities available|activities available.*for.*Project|grouped by heading/i.test(displayContent);
  const isDprProgressRecordingContext = /how you want to record the progress|Please choose one|Reply with quantity or percentage|quantity or percentage/i.test(displayContent);
  const isDprOptionalDetailsContext = /optional details|Contractor.*Vendor|Remarks.*notes|say.*no.*to skip|or simply.*no/i.test(displayContent);
  const isDprReviewSubmitContext = /successfully created|View the DPR|download the PDF|Review and submit|ready to submit|ready to review/i.test(displayContent);
  const isDprSubmitConfirmContext = /reply yes to submit|no if you want to add or modify|Please reply yes to submit/i.test(displayContent);

  const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    // Paragraphs - compact spacing in chat; make "Review and submit" and "Yes"/"No" clickable when at end of DPR creation
    p: ({ children }) => {
      if (!isUser && onOptionClick) {
        const pText = getTextFromNode(children).trim();
        if (isDprReviewSubmitContext && /Review and submit|review and submit/i.test(pText) && pText.length <= 80) {
          return (
            <span className="block [&+&]:mt-1.5">
              <button
                type="button"
                onClick={() => onOptionClick('Review and submit')}
                className={`w-full sm:w-auto mt-2 px-4 py-2.5 rounded-lg border transition-all cursor-pointer font-bold text-sm ${
                  isDark
                    ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white border-[#6B8E23]'
                    : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white border-[#6B8E23]'
                }`}
              >
                {children}
              </button>
            </span>
          );
        }
        if (isDprSubmitConfirmContext && /^yes\s*$/i.test(pText)) {
          return (
            <span className="block [&+&]:mt-1.5">
              <button
                type="button"
                onClick={() => onOptionClick('yes')}
                className={`inline-flex mt-2 px-4 py-2.5 rounded-lg border transition-all cursor-pointer font-bold text-sm ${
                  isDark
                    ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white border-[#6B8E23]'
                    : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white border-[#6B8E23]'
                }`}
              >
                {children}
              </button>
            </span>
          );
        }
        if (isDprSubmitConfirmContext && /^no\s*$/i.test(pText)) {
          return (
            <span className="block [&+&]:mt-1.5">
              <button
                type="button"
                onClick={() => onOptionClick('no')}
                className={`inline-flex mt-2 ml-2 px-4 py-2.5 rounded-lg border transition-all cursor-pointer font-bold text-sm ${
                  isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-600'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                }`}
              >
                {children}
              </button>
            </span>
          );
        }
        // Instruction paragraph: "Please reply yes to submit, or no if you want to add or modify anything." - append Yes/No buttons
        if (isDprSubmitConfirmContext && /reply\s+yes\s+to\s+submit|reply\s+no\s+if\s+you\s+want/i.test(pText)) {
          return (
            <span className="block [&+&]:mt-1.5">
              {children}
              <span className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onOptionClick('yes')}
                  className={`inline-flex px-4 py-2.5 rounded-lg border transition-all cursor-pointer font-bold text-sm ${
                    isDark
                      ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white border-[#6B8E23]'
                      : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white border-[#6B8E23]'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onOptionClick('no')}
                  className={`inline-flex px-4 py-2.5 rounded-lg border transition-all cursor-pointer font-bold text-sm ${
                    isDark
                      ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-600'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                  }`}
                >
                  No
                </button>
              </span>
            </span>
          );
        }
      }
      return <span className="block [&+&]:mt-1.5">{children}</span>;
    },

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

    // Lists - clean bullets/numbers; when onOptionClick provided, list items render as buttons
    ul: ({ children }) => (
      <ul className={makeListItemsClickable ? 'my-2 space-y-2 list-none ml-0 pl-0' : 'my-1.5 ml-4 list-disc space-y-0.5'}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={makeListItemsClickable ? 'my-2 space-y-2 list-none ml-0 pl-0' : 'my-1.5 ml-4 list-decimal space-y-0.5'}>{children}</ol>
    ),
    li: ({ children }) => {
      if (makeListItemsClickable) {
        const text = getTextFromNode(children).trim();
        const isProjectListItem = isProjectSelectionContext && /\(ID:\s*\d+\)\s*$/.test(text) && text.length >= 3;
        const isSubprojectListItem = isSubprojectSelectionContext && /\(ID:\s*\d+\)\s*$/.test(text) && text.length >= 3;
        const isActivityListItem = isActivitiesListContext && /Activity ID:\s*\d+/.test(text) && !/\(empty\)/i.test(text);
        const isIdTaggedListItem = isProjectListItem || isSubprojectListItem || isActivityListItem;
        const isDprProgressOption = isDprProgressRecordingContext && /Quantity of work done|Completion percentage|^quantity\s*$|^percentage\s*$/i.test(text);
        const isDprOptionalDetailsOption = isDprOptionalDetailsContext && (/Contractor.*Vendor|Remarks.*notes|^no\s*$/i.test(text) || text.trim().toLowerCase() === 'no');
        const isDprReviewSubmitOption = isDprReviewSubmitContext && /Review and submit|review and submit/i.test(text);
        const isDprYesNoOption = isDprSubmitConfirmContext && (/^yes\s*$/i.test(text.trim()) || /^no\s*$/i.test(text.trim()));
        const isDprChoiceOption = isDprProgressOption || isDprOptionalDetailsOption || isDprReviewSubmitOption || isDprYesNoOption;
        const isExplanatoryOrInstruction =
          !isDprChoiceOption &&
          ((text.length < 18 && !isIdTaggedListItem) ||
          text.endsWith('?') ||
          text.startsWith('(') ||
          /^\w+\)?\s*$/.test(text) ||
          (text.startsWith('or ') && text.length < 25) ||
          (text.startsWith('and ') && text.length < 25) ||
          /which .* should I|what are you looking for|can you /i.test(text) ||
          /^(Once |I'll |I will |Then |come back and |After that|Next,|First,|Second,)/i.test(text) ||
          /^(Reply with|For example:|OR\s*$)/i.test(text) ||
          /^(The |A |An |Each |Used as|Take |Fetch |Join |Filtered by)/i.test(text) ||
          text.includes('`') ||
          /^(code|specification|unit|quantity|remarks|stock|header|line item)s?\b/i.test(text));
        const hasOptionLikePhrase = /(upload|search|list all|show me|or ask me|you can|try |get |find |open )/i.test(text);
        const hasConfirmationFormat = /\d+\s+\w+.*\+.*\d+/.test(text) || /^["'].*["']$/.test(text);
        const isYesNoOrFreeFormPrompt = /^Yes\s*$/i.test(text) || /^No\s*$/i.test(text) || /^Reply Yes or tell me|^tell me the .* you prefer/i.test(text);
        const isDprAddOption = isDprAddContentContext && /^(Activities|Materials used|Labour deployment|Machinery|Safety incidents|Hindrances)/i.test(text) && !/^Just tell me/i.test(text);
        const isShortDprOption = (isDprProgressOption || isDprOptionalDetailsOption || isDprYesNoOption) && text.length >= 2;
        const minLen = isConfirmationContext ? 6 : 10;
        const meetsMinLength = text.length >= minLen || isShortDprOption;
        const skipYesNoFilter = (isDprOptionalDetailsOption && /^no\s*$/i.test(text.trim())) || isDprYesNoOption;
        const looksLikeOption = !isFreeFormConfirmationContext && meetsMinLength && !isExplanatoryOrInstruction && (!isYesNoOrFreeFormPrompt || skipYesNoFilter) && (isConfirmationContext || hasOptionLikePhrase || hasConfirmationFormat || isProjectListItem || isSubprojectListItem || isDprAddOption || isActivityListItem || isDprProgressOption || isDprOptionalDetailsOption || isDprReviewSubmitOption || isDprYesNoOption);
        const hasNested = hasNestedList(children);
        if (looksLikeOption && !hasNested) {
          return (
            <li className="leading-tight">
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  const el = e.currentTarget;
                  const btnText = el.textContent?.trim();
                  if (btnText && onOptionClick) onOptionClick(btnText);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const btnText = el.textContent?.trim();
                    if (btnText && onOptionClick) onOptionClick(btnText);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer font-medium text-sm ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-600/60 hover:bg-slate-700/70 hover:border-[#C2D642]/40'
                    : 'bg-slate-100/80 border-slate-200 hover:bg-slate-200/80 hover:border-[#C2D642]/50'
                }`}
              >
                {children}
              </div>
            </li>
          );
        }
        return <li className="leading-tight">{children}</li>;
      }
      return <li className="leading-tight">{children}</li>;
    },

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

    // Tables - simple grid with vertical column separators
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table className={`min-w-full border-collapse text-[0.9em] border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className={isDark ? 'border-b border-slate-600' : 'border-b border-slate-300'}>
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th
        className={`px-2 py-1 text-left font-bold border-r ${
          isUser
            ? 'bg-white/20 text-white border-white/30'
            : isDark
              ? 'bg-slate-700 text-slate-200 border-slate-600'
              : 'bg-slate-100 text-slate-800 border-slate-300'
        }`}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={`px-2 py-1 border-r ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
      >
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
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}
