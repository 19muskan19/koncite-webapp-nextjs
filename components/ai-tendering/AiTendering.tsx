'use client';

import React from 'react';
import { useToast } from '@/contexts/ToastContext';
import type { DocKind, DocSelection, TenderType } from './types';
import { postProcessTender } from './api';
import { DsrBrowseModal, TenderHealthIndicators } from './TenderAssistPanels';
import { TENDER_DEMO_DATA } from './demoData';
import { loadMemory, saveMemory, type MemoryStore } from './memory';
import AnalysisDashboard from './AnalysisDashboard';
import ImmersiveDashboard from './ImmersiveDashboard';
import SetupScreen from './SetupScreen';
import type { TenderAnalysisResponse } from './types';

const initialSel = (): Record<DocKind, DocSelection> => ({
  boq: { source: 'default', slot: null, file: null },
  kb: { source: 'default', slot: null, file: null },
  dsr: { source: 'default', slot: null, file: null },
});

function getEffectiveDoc(
  doc: DocKind,
  sel: DocSelection
): { source: 'default' | 'saved' | 'upload'; file?: File; slot?: DocSelection['slot']; label: string } {
  if (sel.source === 'upload' && sel.file) return { source: 'upload', file: sel.file, label: sel.file.name };
  if (sel.source === 'saved' && sel.slot) return { source: 'saved', slot: sel.slot, label: sel.slot.name };
  return { source: 'default', label: 'default' };
}

/** FastAPI `process` only accepts `boq_file` (multipart), not `boq_data` — convert Saved-slot data URLs. */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  if (parts.length < 2) throw new Error('Invalid saved file (missing data)');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(parts[1]);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export default function AiTendering() {
  const { showSuccess, showError } = useToast();
  const [tenderType, setTenderType] = React.useState<TenderType>('PRIVATE');
  const [mem, setMem] = React.useState<MemoryStore>(() => loadMemory());
  const [sel, setSel] = React.useState(initialSel);
  const [view, setView] = React.useState<'setup' | 'results'>('setup');
  const [result, setResult] = React.useState<TenderAnalysisResponse | null>(null);
  const [running, setRunning] = React.useState(false);
  const [progressOn, setProgressOn] = React.useState(false);
  const [progressPct, setProgressPct] = React.useState(0);
  const [stepDone, setStepDone] = React.useState(0);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [libraryTab, setLibraryTab] = React.useState<TenderType>('GOVERNMENT');
  const [immersiveOpen, setImmersiveOpen] = React.useState(false);
  const [dsrOpen, setDsrOpen] = React.useState(false);

  React.useEffect(() => {
    saveMemory(mem);
  }, [mem]);

  const handleTenderType = (t: TenderType) => {
    setTenderType(t);
    setSel(initialSel());
  };

  const showToast = (message: string, type?: 'success' | 'error') => {
    if (type === 'error') showError(message);
    else showSuccess(message);
  };

  /** Upload or Saved tab selected but nothing attached yet — avoid falling back to defaults silently. */
  function docSelectionError(s: DocSelection, label: string): string | null {
    if (s.source === 'upload' && !s.file) return `${label}: attach a file, or switch to Default / Saved.`;
    if (s.source === 'saved' && !s.slot) return `${label}: pick a saved file, or switch to Default / Upload.`;
    return null;
  }

  const runAnalysis = async () => {
    const vBoq = docSelectionError(sel.boq, 'BOQ');
    if (vBoq) {
      showError(vBoq);
      return;
    }
    // KB/DSR paths come from `server.py` (PRIV_DEFAULT_KB etc.) — UI tabs are informational.

    setErrMsg(null);
    setRunning(true);
    setProgressOn(true);
    setProgressPct(0);
    setStepDone(0);

    const boqDoc = getEffectiveDoc('boq', sel.boq);
    const kbDoc = getEffectiveDoc('kb', sel.kb);
    const dsrDoc = getEffectiveDoc('dsr', sel.dsr);

    const anim = async (steps: number[], ms: number) => {
      const fills: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
      for (let i = 0; i < steps.length; i++) {
        const id = steps[i];
        setStepDone(id);
        setProgressPct(fills[id] ?? 50);
        await new Promise((r) => setTimeout(r, ms));
      }
    };

    try {
      await anim([1, 2, 3], 320);
      const fd = new FormData();
      fd.append('tender_type', tenderType);
      fd.append('use_ai', 'false');
      if (boqDoc.source === 'upload' && boqDoc.file) {
        fd.append('boq_file', boqDoc.file);
      } else if (boqDoc.source === 'saved' && boqDoc.slot) {
        fd.append('boq_file', dataUrlToFile(boqDoc.slot.dataUrl, boqDoc.slot.name));
      }
      // POST tender process — same-origin `/api-proxy/tender/process` (see `api.ts` + `next.config.js`)
      const data = await postProcessTender(fd);
      await anim([4, 5], 280);
      setProgressOn(false);
      setResult({
        ...data,
        _docInfo: {
          boq: boqDoc.label,
          kb: kbDoc.source !== 'default' ? `${kbDoc.label} (UI; KB path is on server)` : '(KB from server.py)',
          dsr: dsrDoc.source !== 'default' ? `${dsrDoc.label} (UI; DSR path is on server)` : '(DSR from server.py)',
        },
      });
      setView('results');
      showSuccess('Analysis complete ✓');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setErrMsg(
        `Analysis failed: ${msg}\n\nDocs: BOQ ${boqDoc.label} · KB ${kbDoc.label}${dsrDoc.label ? ` · DSR ${dsrDoc.label}` : ''}`
      );
      setProgressOn(false);
      showError(`Analysis failed — ${msg}`);
    } finally {
      setRunning(false);
      setProgressOn(false);
      setTimeout(() => {
        setStepDone(0);
        setProgressPct(0);
      }, 400);
    }
  };

  const loadDemo = () => {
    setErrMsg(null);
    setResult({ ...TENDER_DEMO_DATA, tender_type: tenderType });
    setView('results');
    showSuccess('Demo data loaded ✓');
  };

  const resetAll = () => {
    setSel(initialSel());
    showSuccess('All selections reset to defaults');
  };

  const backToSetup = () => {
    setView('setup');
    setResult(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#060910] font-sans text-[#e2eaf5]">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.055] bg-[#060910]/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#f0b429] to-[#c47f0d] font-black text-[#060910] shadow-[0_0_24px_rgba(240,180,41,0.3)]">
            K
          </div>
          <div>
            <div className="bg-gradient-to-r from-[#f0b429] to-white bg-clip-text text-lg font-black tracking-wider text-transparent">
              Ai-Tendering
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TenderHealthIndicators />
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#111720] px-2.5 py-1 font-mono text-[10px] text-[#5c7a99]">
            📅 {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="rounded-lg border border-white/10 px-3 py-1 text-[11px] text-[#5c7a99] hover:text-[#e2eaf5]"
          >
            📚 Doc Library
          </button>
          <button
            type="button"
            onClick={() => setDsrOpen(true)}
            className="rounded-lg border border-white/10 px-3 py-1 text-[11px] text-[#5c7a99] hover:text-[#e2eaf5]"
          >
            📖 DSR &amp; categories
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] px-4 pb-20 pt-2">
        {view === 'setup' && (
          <>
            <SetupScreen
              tenderType={tenderType}
              onTenderType={handleTenderType}
              mem={mem}
              sel={sel}
              setSel={setSel}
              setMem={setMem}
              onRun={runAnalysis}
              onDemo={loadDemo}
              onReset={resetAll}
              onOpenLibrary={() => setLibraryOpen(true)}
              onOpenImmersive={() => setImmersiveOpen(true)}
              running={running}
              showToast={showToast}
            />
            {errMsg ? (
              <div className="mx-auto mt-4 max-w-[1120px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 whitespace-pre-wrap">
                ⚠ {errMsg}
              </div>
            ) : null}
            {progressOn && (
              <div className="mx-auto mt-6 max-w-[1120px]">
                <div className="mb-3 h-1 overflow-hidden rounded bg-[#172030]">
                  <div
                    className="h-full bg-gradient-to-r from-[#f0b429] to-[#00c9a7] transition-[width] duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    '📂 Parsing BOQ',
                    '🔍 Rate Matching',
                    '📐 Rate Analysis',
                    '💰 Financials',
                    '📊 Building Report',
                  ].map((label, i) => (
                    <span
                      key={label}
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
                        stepDone > i + 1
                          ? 'border-[#00c9a7]/30 bg-[#00c9a7]/10 text-[#00c9a7]'
                          : stepDone === i + 1
                            ? 'border-[#f0b429]/35 bg-[#f0b429]/10 text-[#f0b429]'
                            : 'border-white/[0.06] text-[#2a3d52]'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {view === 'results' && result && (
          <AnalysisDashboard data={result} onBack={backToSetup} onImmersive={() => setImmersiveOpen(true)} />
        )}
      </div>

      <footer className="border-t border-white/[0.055] py-4 text-center font-mono text-[10px] text-[#2a3d52]">
        Ai-Tendering — Private + Government + Immersive Dashboard
        {result?.project_info?.name ? ` · ${result.project_info.name}` : ''}
      </footer>

      <DsrBrowseModal open={dsrOpen} onClose={() => setDsrOpen(false)} showToast={showToast} />

      {libraryOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-white/[0.06] bg-[#0c1018] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h4 className="font-black tracking-wide text-[#f0b429]">📚 Document Library</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLibraryTab('GOVERNMENT')}
                  className={`rounded-lg px-3 py-1 text-[11px] font-mono ${
                    libraryTab === 'GOVERNMENT' ? 'bg-[#f0b429]/10 text-[#f0b429]' : 'text-[#5c7a99]'
                  }`}
                >
                  🏛️ Government
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryTab('PRIVATE')}
                  className={`rounded-lg px-3 py-1 text-[11px] font-mono ${
                    libraryTab === 'PRIVATE' ? 'bg-[#f0b429]/10 text-[#f0b429]' : 'text-[#5c7a99]'
                  }`}
                >
                  🏗️ Private
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(false)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-[#5c7a99]"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="custom-scrollbar max-h-[60vh] space-y-4 overflow-y-auto p-4">
              {(['boq', 'kb', 'dsr'] as const)
                .filter((d) => libraryTab === 'GOVERNMENT' || d !== 'dsr')
                .map((doc) => {
                  const label = doc === 'boq' ? 'BOQ Files' : doc === 'kb' ? 'Rate Analysis / KB' : 'DSR Reference';
                  const icon = doc === 'boq' ? '📋' : doc === 'kb' ? '📊' : '📖';
                  const slots = mem[libraryTab][doc];
                  return (
                    <div key={doc}>
                      <div className="mb-2 flex justify-between font-mono text-[10px] uppercase text-[#5c7a99]">
                        <span>
                          {icon} {label}
                        </span>
                        <span>
                          {slots.length}/10 slots
                        </span>
                      </div>
                      <div className="space-y-1">
                        {!slots.length ? (
                          <div className="rounded-lg border border-dashed border-white/[0.06] py-6 text-center text-[11px] text-[#2a3d52]">
                            No files saved for {libraryTab}.
                          </div>
                        ) : (
                          slots.map((s, i) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#111720] px-3 py-2"
                            >
                              <span>{icon}</span>
                              <span className="min-w-0 flex-1 truncate font-mono text-xs">{s.name}</span>
                              <span className="text-[10px] text-[#2a3d52]">{s.date}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMem((prev) => {
                                    const next = { ...prev, [libraryTab]: { ...prev[libraryTab], [doc]: [...prev[libraryTab][doc]] } };
                                    next[libraryTab][doc].splice(i, 1);
                                    return next;
                                  });
                                  showSuccess(`Removed: ${s.name}`);
                                }}
                                className="text-[10px] text-[#5c7a99] hover:text-red-400"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <ImmersiveDashboard
        open={immersiveOpen}
        onClose={() => setImmersiveOpen(false)}
        currentAnalysis={result}
        defaultTenderType={tenderType}
        showToast={showToast}
      />
    </div>
  );
}
