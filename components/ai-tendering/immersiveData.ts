import type { ImmersiveData, TenderAnalysisResponse, TenderType } from './types';
import { TENDER_DEMO_DATA } from './demoData';
import { buildCategoryBreakdownFromItems, countConf, getFinancials, normalizeItems } from './utils';

function mapRes(
  res: TenderAnalysisResponse['resources'],
  fallback: NonNullable<TenderAnalysisResponse['resources']>
): NonNullable<TenderAnalysisResponse['resources']> {
  const mapArr = (arr: unknown): Array<[string, number]> => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => {
      if (Array.isArray(x)) return [String(x[0]), Number(x[1]) || 0] as [string, number];
      const o = x as { name?: string; value?: number };
      return [String(o.name ?? ''), Number(o.value) || 0] as [string, number];
    });
  };
  return {
    labour: mapArr(res?.labour?.length ? res.labour : fallback.labour),
    materials: mapArr(res?.materials?.length ? res.materials : fallback.materials),
    machinery: mapArr(res?.machinery?.length ? res.machinery : fallback.machinery),
  };
}

export function buildImmersiveFromAnalysis(
  d: TenderAnalysisResponse,
  fallbackType: TenderType,
  filename = 'current_analysis'
): ImmersiveData {
  const items = normalizeItems(d);
  const f = getFinancials(d, items);
  const wp = d.win_probability ?? {};
  const pi = d.project_info ?? {};
  const fb = TENDER_DEMO_DATA.resources!;
  const res = mapRes(d.resources, fb);

  const catData =
    d.category_breakdown && Object.keys(d.category_breakdown).length > 0
      ? d.category_breakdown
      : buildCategoryBreakdownFromItems(items);

  return {
    filename,
    projectName: pi.name ?? d.project_name ?? 'Tender Analysis',
    tenderType: d.tender_type ?? fallbackType,
    totalItems: f.total_items ?? items.length,
    calcValue: f.total_current ?? f.calculated_value ?? 0,
    optValue: f.total_optimized ?? f.optimized_value ?? 0,
    saving: f.total_saving ?? f.saving ?? 0,
    savingPct: f.saving_pct ?? 0,
    boqItems: items,
    resources: res,
    catData,
    winCurr: wp.current_win_probability ?? 45,
    winOpt: wp.optimized_win_probability ?? 65,
    conf: countConf(items),
    sheets: ['Cover', 'BOQ Analysis', 'Rate Analysis', 'Resource Summary'],
  };
}
