'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  /** Value in YYYY-MM-DD format (for form state/API) */
  value?: string;
  /** Called with YYYY-MM-DD when date changes. Accepts synthetic target shape for compatibility with form handlers. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: string; name?: string } }) => void;
  /** CSS classes for dark/light mode - pass textSecondary for icon */
  iconClassName?: string;
  /** Container className */
  containerClassName?: string;
}

function toDisplay(value: string): string {
  if (!value || value.length < 10) return '';
  const d = value.slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`; // dd/mm/yyyy
  return value;
}

function toValue(display: string): string | null {
  const cleaned = display.replace(/\D/g, '');
  if (cleaned.length === 8) {
    const dd = cleaned.slice(0, 2);
    const mm = cleaned.slice(2, 4);
    const yy = cleaned.slice(4, 8);
    const d = parseInt(dd, 10);
    const m = parseInt(mm, 10);
    const y = parseInt(yy, 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return `${y}-${mm}-${dd}`;
    }
  }
  return null;
}

/** Always show dd/mm/yyyy with slashes constant. User types digits only. */
function formatTyping(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length === 0) return '';
  if (d.length <= 2) return `${d}/`;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}/`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Date input: numbers only, auto-formatted as dd/mm/yyyy. One Calendar icon opens native picker.
 */
export default function DatePickerInput({
  value = '',
  onChange,
  iconClassName = 'text-slate-500',
  containerClassName = '',
  className = '',
  name,
  min,
  max,
  ...restProps
}: DatePickerInputProps) {
  const textRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(() => toDisplay(value));
  const [isFocused, setIsFocused] = useState(false);

  const syncFromValue = useCallback((v: string) => {
    setDisplay(toDisplay(v));
  }, []);

  React.useEffect(() => {
    if (!isFocused) syncFromValue(value);
  }, [value, isFocused, syncFromValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) {
      if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    }
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = formatTyping(digitsOnly);
    setDisplay(formatted);
    let parsed = toValue(formatted);

    if (parsed && min) {
      const minStr = String(min);
      if (minStr.length >= 10) {
        const minDate = minStr.slice(0, 10);
        if (parsed < minDate) parsed = minDate;
      }
    }
    if (parsed && max) {
      const maxStr = String(max);
      if (maxStr.length >= 10) {
        const maxDate = maxStr.slice(0, 10);
        if (parsed > maxDate) parsed = maxDate;
      }
    }

    if (onChange) {
      onChange({ target: { value: parsed ?? '', name } });
    }
    if (parsed && parsed !== toValue(formatted)) {
      setDisplay(toDisplay(parsed));
    }
  };

  const handleTextBlur = () => {
    setIsFocused(false);
    syncFromValue(value);
  };

  const handleTextFocus = () => setIsFocused(true);

  const handleIconClick = () => {
    const hidden = hiddenRef.current;
    if (!hidden) return;
    const valStr = value != null ? String(value) : '';
    const current = valStr.length >= 10 ? valStr.slice(0, 10) : '';
    // Use current value only - do NOT default to today when empty, otherwise selecting today
    // won't fire onChange (value unchanged) and the field remains empty
    hidden.value = current;
    hidden.focus();
    if (typeof (hidden as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      (hidden as HTMLInputElement & { showPicker: () => void }).showPicker();
    }
  };

  const handleHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (min && v) {
      const minStr = String(min);
      if (minStr.length >= 10) {
        const minDate = minStr.slice(0, 10);
        if (v < minDate) v = minDate;
      }
    }
    if (max && v) {
      const maxStr = String(max);
      if (maxStr.length >= 10) {
        const maxDate = maxStr.slice(0, 10);
        if (v > maxDate) v = maxDate;
      }
    }
    if (v && onChange) onChange({ target: { value: v, name } });
    setDisplay(toDisplay(v));
  };

  return (
    <div className={`relative ${containerClassName}`}>
      <Calendar
        onClick={handleIconClick}
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${iconClassName} cursor-pointer z-10`}
      />
      <input
        ref={textRef}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={display}
        onKeyDown={handleKeyDown}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onFocus={handleTextFocus}
        name={name}
        className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold transition-all focus:ring-2 focus:ring-[#C2D642]/20 outline-none border ${className}`}
        {...restProps}
      />
      <input
        ref={hiddenRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        max={max}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        onChange={handleHiddenChange}
      />
    </div>
  );
}
