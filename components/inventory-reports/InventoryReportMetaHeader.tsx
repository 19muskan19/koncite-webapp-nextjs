'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import type { InventoryReportMeta } from '@/types/inventoryReportMeta';
import { getCompanyLogoImageSrc } from '@/utils/imageUtils';

type Props = {
  meta: InventoryReportMeta;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
};

/**
 * Company / project / subproject strip for inventory reports (matches API `meta`).
 */
export default function InventoryReportMetaHeader({ meta, isDark, textPrimary, textSecondary }: Props) {
  const companyName = meta.company?.name?.trim();
  const projectName = meta.project?.name?.trim();
  const subName = meta.subProject?.name?.trim();
  const companyLogo = getCompanyLogoImageSrc(meta.company?.logo ?? '');
  const projectLogo = getCompanyLogoImageSrc(meta.project?.logo ?? '');
  const subLogo = getCompanyLogoImageSrc(meta.subProject?.logo ?? '');
  const showCompany = Boolean(companyName || companyLogo);
  const showProject = Boolean(projectName || projectLogo);
  const showSub = Boolean(subName || subLogo);
  const sd = meta.selectedDate;
  const dateHint =
    sd?.from && sd?.to
      ? `${sd.from} → ${sd.to}`
      : sd?.date
        ? String(sd.date)
        : sd?.from || sd?.to
          ? [sd.from, sd.to].filter(Boolean).join(' → ')
          : '';

  if (!showCompany && !showProject && !showSub) return null;

  const pill = (label: string, name: string, logoSrc: string | null, key: string) => (
    <div key={key} className="flex items-start gap-3 min-w-0 max-w-full sm:max-w-[280px]">
      <div
        className={`shrink-0 w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden ${
          isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'
        }`}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="max-w-full max-h-full w-auto h-auto object-contain p-1" referrerPolicy="no-referrer" />
        ) : (
          <Building2 className={`w-7 h-7 ${textSecondary}`} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>{label}</p>
        <p className={`text-sm font-bold leading-snug truncate ${textPrimary}`} title={name}>
          {name}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`px-4 py-4 border-b ${
        isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-4 lg:gap-8">
        {showCompany ? pill('Company', companyName || '—', companyLogo, 'company') : null}
        {showProject ? pill('Project', projectName || '—', projectLogo, 'project') : null}
        {showSub ? pill('Sub project', subName || '—', subLogo, 'sub') : null}
      </div>
      {dateHint ? (
        <p className={`mt-3 text-xs font-semibold ${textSecondary}`}>
          Report period: <span className={textPrimary}>{dateHint}</span>
        </p>
      ) : null}
    </div>
  );
}
