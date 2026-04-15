import type { TenderType } from './types';

/** Display labels for “Default” document source (paths come from backend when using defaults). */
export const DEFAULT_DOC_LABELS: Record<
  TenderType,
  { boq: string; kb: string; dsr: string; dsrNote: string }
> = {
  GOVERNMENT: {
    boq: 'Sample GOVT BOQ (MES / IAFW)',
    kb: 'Contracting Rate Analysis KB',
    dsr: 'DSR-2021 Built-in Rate Table',
    dsrNote: 'GOVT ONLY',
  },
  PRIVATE: {
    boq: 'Builder BOQ sample',
    kb: 'Realestate Rate Analysis KB',
    dsr: 'Not used for Private',
    dsrNote: 'optional',
  },
};
