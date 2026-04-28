'use client';

import React from 'react';
import type { DocKind, DocSelection, MemorySlotEntry, TenderType } from './types';
import { DEFAULT_DOC_LABELS } from './defaultDocs';
import type { MemoryStore } from './memory';
import { MAX_SLOTS } from './memory';

type SrcTab = 'default' | 'saved' | 'upload';

interface SetupScreenProps {
  tenderType: TenderType;
  onTenderType: (t: TenderType) => void;
  mem: MemoryStore;
  sel: Record<DocKind, DocSelection>;
  setSel: React.Dispatch<React.SetStateAction<Record<DocKind, DocSelection>>>;
  setMem: React.Dispatch<React.SetStateAction<MemoryStore>>;
  onRun: () => void;
  onDemo: () => void;
  onReset: () => void;
  onOpenLibrary: () => void;
  onOpenImmersive: () => void;
  running: boolean;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const DOC_ICONS: Record<DocKind, string> = { boq: '📋', kb: '📊', dsr: '📖' };

function saveFileToMemory(
  tenderType: TenderType,
  docType: DocKind,
  file: File,
  setMem: React.Dispatch<React.SetStateAction<MemoryStore>>,
  showToast: SetupScreenProps['showToast']
): void {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    setMem((prev) => {
      const next: MemoryStore = {
        ...prev,
        [tenderType]: { ...prev[tenderType], [docType]: [...prev[tenderType][docType]] },
      };
      const slots = next[tenderType][docType];
      if (slots.length >= MAX_SLOTS) {
        slots.shift();
        showToast(`Memory full — oldest ${docType.toUpperCase()} file removed`, 'error');
      }
      slots.push({
        id: Date.now() + Math.random(),
        name: file.name,
        docType,
        tenderType,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        dataUrl: result,
      });
      return next;
    });
    showToast(`${file.name} saved to ${docType.toUpperCase()} memory`, 'success');
  };
  reader.readAsDataURL(file);
}

export default function SetupScreen({
  tenderType,
  onTenderType,
  mem,
  sel,
  setSel,
  setMem,
  onRun,
  onDemo,
  onReset,
  onOpenLibrary,
  onOpenImmersive,
  running,
  showToast,
}: SetupScreenProps) {
  const setTab = (doc: DocKind, tab: SrcTab) => {
    if (tab === 'default') {
      setSel((s) => ({ ...s, [doc]: { source: 'default', slot: null, file: null } }));
    } else if (tab === 'upload') {
      setSel((s) => ({ ...s, [doc]: { source: 'upload', slot: null, file: null } }));
    } else {
      setSel((s) => ({ ...s, [doc]: { source: 'saved', slot: s[doc].slot, file: null } }));
    }
  };

  const pickDoc = (doc: DocKind, file: File | undefined, saveChk: boolean) => {
    if (!file) return;
    setSel((s) => ({ ...s, [doc]: { source: 'upload', slot: null, file } }));
    if (saveChk) saveFileToMemory(tenderType, doc, file, setMem, showToast);
  };

  const selectSlot = (doc: DocKind, slot: MemorySlotEntry) => {
    setSel((s) => ({ ...s, [doc]: { source: 'saved', slot, file: null } }));
    showToast(`${slot.name} selected for ${doc.toUpperCase()}`, 'success');
  };

  const deleteSlot = (doc: DocKind, index: number) => {
    const removedId = mem[tenderType][doc][index]?.id;
    const removedName = mem[tenderType][doc][index]?.name;
    setMem((prev) => {
      const next: MemoryStore = { ...prev, [tenderType]: { ...prev[tenderType], [doc]: [...prev[tenderType][doc]] } };
      next[tenderType][doc].splice(index, 1);
      return next;
    });
    setSel((s) => {
      if (removedId != null && s[doc].slot?.id === removedId) {
        return { ...s, [doc]: { source: 'default', slot: null, file: null } };
      }
      return s;
    });
    if (removedName) showToast(`Removed: ${removedName}`, 'success');
  };

  const defaults = DEFAULT_DOC_LABELS[tenderType];
  const slotsFor = (doc: DocKind) => mem[tenderType][doc];
  const cnt = (doc: 'boq' | 'kb') => `${mem.GOVERNMENT[doc].length}/${mem.PRIVATE[doc].length}`;

  const DocCard = ({ doc, step }: { doc: DocKind; step: number }) => {
    const tab = sel[doc].source;
    const list = slotsFor(doc);
    const s = sel[doc];

    return (
      <div className="rounded-[18px] border border-white/[0.06] bg-[#0c1018] p-5">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-[#172030] text-[9px] text-[#2a3d52]">
            {step}
          </span>
          {doc === 'boq' && 'Bill of Quantities (BOQ)'}
          {doc === 'kb' && 'Rate Analysis / Knowledge Base'}
          {doc === 'dsr' && (
            <>
              DSR Reference{' '}
              <span className="ml-1 font-mono text-[9px] normal-case text-[#2a3d52]">
                ({tenderType === 'GOVERNMENT' ? 'GOVT ONLY' : 'optional'})
              </span>
            </>
          )}
        </div>
        <div className="mb-3 flex gap-1 rounded-lg bg-[#111720] p-1">
          {(['default', 'saved', 'upload'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(doc, t)}
              className={`flex-1 rounded-md px-2 py-1.5 text-center text-[11px] transition-colors ${
                tab === t
                  ? 'border border-white/10 bg-[#172030] text-[#e2eaf5]'
                  : 'text-[#5c7a99] hover:text-[#e2eaf5]'
              }`}
            >
              {t === 'default' && 'Default'}
              {t === 'saved' && (
                <>
                  Saved ({doc === 'dsr' ? mem.GOVERNMENT.dsr.length : cnt(doc as 'boq' | 'kb')})
                </>
              )}
              {t === 'upload' && 'Upload New'}
            </button>
          ))}
        </div>

        {tab === 'default' && (
          <div className="space-y-2 rounded-lg border border-white/[0.06] bg-[#111720] p-3 text-[11px]">
            <div className="flex items-start gap-2 border-b border-white/[0.06] py-1.5 last:border-0">
              <span className="min-w-[36px] font-mono text-[10px] text-[#5c7a99]">
                {DOC_ICONS[doc]} {doc.toUpperCase()}
              </span>
              <span className="flex-1 break-all text-[#e2eaf5]">
                {doc === 'boq' && defaults.boq}
                {doc === 'kb' && defaults.kb}
                {doc === 'dsr' && defaults.dsr}
              </span>
              <span className="shrink-0 rounded border border-[#00c9a7]/30 bg-[#00c9a7]/10 px-1.5 py-0.5 text-[9px] text-[#00c9a7]">
                DEFAULT
              </span>
            </div>
            <div className="rounded border border-[#00c9a7]/25 bg-[#00c9a7]/[0.07] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#00c9a7]">
              <strong className="text-white">Using:</strong>{' '}
              {doc === 'boq' && 'Default BOQ file'}
              {doc === 'kb' && 'Default Rate Analysis KB'}
              {doc === 'dsr' && 'DSR-2021 Built-in Rate Table'}
            </div>
          </div>
        )}

        {tab === 'saved' && (
          <div>
            <div className="mb-2 text-right font-mono text-[10px] text-[#2a3d52]">
              {list.length}/{MAX_SLOTS} slots used ({tenderType})
            </div>
            <div className="custom-scrollbar max-h-[220px] space-y-1 overflow-y-auto">
              {!list.length ? (
                <div className="px-4 py-5 text-center font-mono text-[11px] leading-relaxed text-[#2a3d52]">
                  No saved {doc.toUpperCase()} files for {tenderType} mode.
                  <br />
                  Upload and save one using &quot;Upload New&quot;.
                </div>
              ) : (
                list.map((slot, i) => (
                  <div
                    key={slot.id}
                    className={`flex w-full items-stretch rounded-lg border transition-colors ${
                      s.slot?.id === slot.id
                        ? 'border-[#f0b429]/50 bg-[#f0b429]/10'
                        : 'border-white/[0.06] bg-[#111720] hover:border-[#00c9a7]/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectSlot(doc, slot)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-inherit hover:bg-white/[0.02]"
                    >
                      <span>{DOC_ICONS[doc]}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#e2eaf5]">{slot.name}</span>
                      <span className="shrink-0 text-[9px] text-[#2a3d52]">
                        {slot.date} · {slot.size}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${slot.name}`}
                      className="shrink-0 self-center rounded-full border border-[#2a3d52] px-1.5 text-[9px] text-[#2a3d52] hover:border-red-400 hover:text-red-400"
                      onClick={() => deleteSlot(doc, i)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
            {s.source === 'saved' && s.slot && (
              <div className="mt-2 rounded border border-[#00c9a7]/25 bg-[#00c9a7]/[0.07] px-3 py-2 font-mono text-[11px] text-[#00c9a7]">
                <strong className="text-white">Selected:</strong> {s.slot.name}
                <br />
                <span className="text-[#5c7a99]">
                  {s.slot.date} · {s.slot.size}
                </span>
              </div>
            )}
          </div>
        )}

        {tab === 'upload' && (
          <UploadZone doc={doc} fileName={s.file?.name} onFile={(f, save) => pickDoc(doc, f, save)} />
        )}
      </div>
    );
  };

  return (
    <div className="text-[#e2eaf5]">
      <div className="py-10 text-center">
        <h1 className="mb-3 bg-gradient-to-br from-[#f0b429] via-white to-[#00c9a7] bg-clip-text text-4xl font-black leading-tight tracking-wide text-transparent sm:text-5xl md:text-6xl">
          TENDER
          <br />
          INTELLIGENCE
        </h1>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#5c7a99]">
          Upload BOQ + Rate KB (+ DSR for government). Run analysis to see win probability, savings, and executive
          summary.
        </p>
      </div>

      <div className="mx-auto mb-7 flex max-w-[480px] flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={() => onTenderType('GOVERNMENT')}
          className={`relative flex-1 rounded-[18px] border-2 px-4 py-4 text-center transition-colors ${
            tenderType === 'GOVERNMENT'
              ? 'border-[#2e7d32] bg-[#2e7d32]/10'
              : 'border-white/[0.06] bg-[#111720] hover:border-[#f0b429]/30'
          }`}
        >
          <span
            className={`absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full border-2 text-[9px] ${
              tenderType === 'GOVERNMENT' ? 'border-[#00c9a7] bg-[#00c9a7] text-[#060910]' : 'border-[#2a3d52]'
            }`}
          >
            {tenderType === 'GOVERNMENT' ? '✓' : ''}
          </span>
          <div className="mb-2 text-2xl">🏛️</div>
          <div className="text-base font-black tracking-wide">Government</div>
          <div className="mt-1 text-[11px] leading-snug text-[#5c7a99]">MES / IAFW / DSR-2021</div>
        </button>
        <button
          type="button"
          onClick={() => onTenderType('PRIVATE')}
          className={`relative flex-1 rounded-[18px] border-2 px-4 py-4 text-center transition-colors ${
            tenderType === 'PRIVATE'
              ? 'border-[#1565c0] bg-[#1565c0]/10'
              : 'border-white/[0.06] bg-[#111720] hover:border-[#f0b429]/30'
          }`}
        >
          <span
            className={`absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full border-2 text-[9px] ${
              tenderType === 'PRIVATE' ? 'border-[#00c9a7] bg-[#00c9a7] text-[#060910]' : 'border-[#2a3d52]'
            }`}
          >
            {tenderType === 'PRIVATE' ? '✓' : ''}
          </span>
          <div className="mb-2 text-2xl">🏗️</div>
          <div className="text-base font-black tracking-wide">Private</div>
          <div className="mt-1 text-[11px] leading-snug text-[#5c7a99]">Builder BOQ / Realestate KB</div>
        </button>
      </div>

      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 lg:grid-cols-3">
        <DocCard doc="boq" step={1} />
        <DocCard doc="kb" step={2} />
        <DocCard doc="dsr" step={3} />
      </div>

      <div className="mx-auto mt-5 flex max-w-[1120px] flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={running}
          onClick={onRun}
          className="inline-flex items-center gap-2.5 rounded-xl border-none bg-gradient-to-br from-[#f0b429] to-[#9e6e20] px-8 py-3.5 text-lg font-black tracking-wide text-[#060910] shadow-[0_4px_22px_rgba(240,180,41,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(240,180,41,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#060910]/30 border-t-[#060910]" />
          ) : (
            '⚡'
          )}
          <span>{running ? 'Running…' : 'Run Analysis'}</span>
        </button>
        <button
          type="button"
          onClick={onDemo}
          className="rounded-xl border border-white/10 bg-[#0c1018] px-4 py-2.5 text-xs text-[#5c7a99] transition hover:border-[#00c9a7] hover:text-[#00c9a7]"
        >
          🎯 Load Demo Data
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/10 bg-[#0c1018] px-4 py-2.5 text-xs text-[#5c7a99] transition hover:border-[#00c9a7] hover:text-[#00c9a7]"
        >
          ↺ Reset Selections
        </button>
        <button
          type="button"
          onClick={onOpenImmersive}
          className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-[#a78bfa]/40 bg-gradient-to-br from-[#a78bfa]/15 to-[#4fa3ff]/15 px-5 py-2.5 text-xs font-semibold text-[#a78bfa] transition hover:border-[#a78bfa]/70 hover:text-[#c4b5fd]"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#a78bfa]" />
          🔮 Immersive Dashboard
        </button>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="ml-auto rounded-xl border border-white/10 bg-[#0c1018] px-3 py-2 text-[11px] text-[#5c7a99] hover:text-[#e2eaf5]"
        >
          📚 Doc Library
        </button>
      </div>
    </div>
  );
}

function UploadZone({
  doc,
  fileName,
  onFile,
}: {
  doc: DocKind;
  fileName?: string;
  onFile: (f: File | undefined, save: boolean) => void;
}) {
  const [save, setSave] = React.useState(true);
  const accept =
    doc === 'boq' ? '.xlsx,.xls,.pdf,.csv' : doc === 'kb' ? '.xlsx,.xls' : '.pdf,.xlsx,.xls';

  return (
    <div>
      <label
        className={`relative block cursor-pointer rounded-xl border-2 border-dashed border-white/10 bg-[#111720] px-4 py-5 text-center transition hover:border-[#f0b429]/50 hover:bg-[#f0b429]/10 ${fileName ? 'border-solid border-[#00c9a7]/50 bg-[#00c9a7]/10' : ''}`}
      >
        <input
          type="file"
          accept={accept}
          className="absolute inset-0 z-[2] cursor-pointer opacity-0"
          onChange={(e) => onFile(e.target.files?.[0], save)}
        />
        <div className="mb-1.5 text-2xl">{DOC_ICONS[doc]}</div>
        <div className="text-[13px] font-semibold">
          {doc === 'boq' && 'Drop BOQ file here'}
          {doc === 'kb' && 'Drop Rate Analysis / KB here'}
          {doc === 'dsr' && 'Drop DSR PDF or Excel here'}
        </div>
        <div className="mt-1 font-mono text-[10px] text-[#5c7a99]">
          {doc === 'boq' && '.xlsx · .xls · .pdf'}
          {doc === 'kb' && '.xlsx · .xls'}
          {doc === 'dsr' && '.pdf · .xlsx · .xls'}
        </div>
        {fileName ? (
          <div className="relative z-[3] mt-2 break-all rounded-md bg-[#0c1018] px-2.5 py-1 font-mono text-[11px] text-[#00c9a7]">
            ✓ {fileName}
          </div>
        ) : null}
      </label>
      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-[#172030] px-2.5 py-2">
        <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="accent-[#00c9a7]" />
        <span className="text-[11px] text-[#5c7a99]">Save to memory for future use</span>
      </label>
    </div>
  );
}
