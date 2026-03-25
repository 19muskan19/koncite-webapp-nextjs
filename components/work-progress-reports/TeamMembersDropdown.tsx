'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

type TeamMembersDropdownProps =
  | {
      teamMembers: TeamMember[];
      isDark: boolean;
      placeholder?: string;
      mode: 'single';
      value: string;
      onChange: (value: string) => void;
      /** Shown as chip when API returned nested user without id match in teamMembers */
      apiDisplay?: { name: string; email?: string; phone?: string } | null;
    }
  | {
      teamMembers: TeamMember[];
      isDark: boolean;
      placeholder?: string;
      mode?: 'multiple';
      value: string[];
      onChange: (value: string[]) => void;
    };

export default function TeamMembersDropdown(props: TeamMembersDropdownProps) {
  const {
    teamMembers,
    isDark,
    placeholder = 'Select team members',
  } = props;
  const isSingle = props.mode === 'single';
  const apiDisplay = isSingle ? (props as { apiDisplay?: { name: string; email?: string; phone?: string } | null }).apiDisplay : null;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedIds: string[] = isSingle
    ? ((props as { value: string }).value ? [(props as { value: string }).value] : [])
    : (props as { value: string[] }).value;
  const selectedMembers = teamMembers.filter((m) => selectedIds.includes(m.id));

  /** Single-select: keep trigger as label only; selection shows in chips below — do not repeat name in the button */
  const displayText =
    isSingle
      ? placeholder
      : selectedMembers.length > 0
        ? `${selectedMembers.length} selected`
        : placeholder;

  const filteredMembers = teamMembers
    .filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((m) => (isSingle && selectedIds[0] === m.id ? false : true));

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((e.target as Element).closest('[data-team-members-dropdown]')) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMember = (id: string) => {
    if (isSingle) {
      const oc = (props as { onChange: (v: string) => void }).onChange;
      oc(selectedIds[0] === id ? '' : id);
      setIsOpen(false);
      return;
    }
    const v = (props as { value: string[] }).value;
    const oc = (props as { onChange: (ids: string[]) => void }).onChange;
    if (v.includes(id)) {
      oc(v.filter((mid) => mid !== id));
    } else {
      oc([...v, id]);
    }
  };

  const removeMember = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isSingle) {
      (props as { onChange: (v: string) => void }).onChange('');
    } else {
      const v = (props as { value: string[] }).value;
      (props as { onChange: (ids: string[]) => void }).onChange(v.filter((mid) => mid !== id));
    }
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-[180px]">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-bold border text-left ${
          isDark
            ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642] placeholder-slate-500'
            : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642] placeholder-slate-400'
        } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {(selectedMembers.length > 0 || (isSingle && apiDisplay?.name)) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedMembers.map((m) => (
            <span
              key={m.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                isDark ? 'bg-slate-700/50 text-slate-200' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.name} ({m.email})
              <button
                type="button"
                onClick={(e) => removeMember(e, m.id)}
                className={`p-0.5 rounded hover:opacity-80 ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {isSingle && selectedMembers.length === 0 && apiDisplay?.name && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                isDark ? 'bg-slate-700/50 text-slate-200' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {apiDisplay.name}
              {(() => {
                const sub = (apiDisplay.email || '').trim() || (apiDisplay.phone || '').trim();
                return sub ? ` (${sub})` : '';
              })()}
            </span>
          )}
        </div>
      )}

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-team-members-dropdown
            className={`fixed z-[9999] rounded-lg border shadow-lg overflow-hidden ${
              isDark ? 'bg-dropdown-panel border-slate-700' : 'bg-white border-slate-200'
            }`}
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
            }}
          >
          <div className={`p-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="relative">
              <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={`w-full pl-8 pr-3 py-2 rounded-lg text-sm font-bold border ${
                  isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className={`px-3 py-4 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {teamMembers.length === 0 ? 'No team members' : 'No matches'}
              </div>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-bold transition-colors ${
                    selectedIds.includes(m.id)
                      ? isDark
                        ? 'bg-[#C2D642]/20 text-[#C2D642]'
                        : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark
                        ? 'hover:bg-dropdown-panel-hover text-slate-100'
                        : 'hover:bg-slate-100 text-slate-900'
                  }`}
                >
                  <span className="truncate">
                    {m.name} ({m.email})
                  </span>
                  {selectedIds.includes(m.id) && (
                    <span className="ml-auto text-[#C2D642]">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
