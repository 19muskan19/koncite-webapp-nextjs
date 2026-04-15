import type { DocKind, MemorySlotEntry, TenderType } from './types';

export const MEMORY_KEY = 'koncite_doc_memory_v1';
export const MAX_SLOTS = 10;

export type MemoryStore = {
  GOVERNMENT: Record<DocKind, MemorySlotEntry[]>;
  PRIVATE: Record<DocKind, MemorySlotEntry[]>;
};

export function initMemory(): MemoryStore {
  return {
    GOVERNMENT: { boq: [], kb: [], dsr: [] },
    PRIVATE: { boq: [], kb: [], dsr: [] },
  };
}

export function loadMemory(): MemoryStore {
  const base = initMemory();
  try {
    const raw = sessionStorage.getItem(MEMORY_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<MemoryStore>;
    for (const t of ['GOVERNMENT', 'PRIVATE'] as const) {
      if (!p[t] || typeof p[t] !== 'object') continue;
      for (const d of ['boq', 'kb', 'dsr'] as const) {
        if (Array.isArray(p[t]![d])) base[t][d] = p[t]![d] as MemorySlotEntry[];
      }
    }
    return base;
  } catch {
    return base;
  }
}

export function saveMemory(mem: MemoryStore): void {
  try {
    sessionStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch {
    // ignore quota
  }
}
