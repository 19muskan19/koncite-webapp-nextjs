export type TenderType = 'GOVERNMENT' | 'PRIVATE';

export type DocKind = 'boq' | 'kb' | 'dsr';

export type DocSource = 'default' | 'saved' | 'upload';

export interface MemorySlotEntry {
  id: number;
  name: string;
  docType: DocKind;
  tenderType: TenderType;
  size: string;
  date: string;
  dataUrl: string;
}

export interface DocSelection {
  source: DocSource;
  slot: MemorySlotEntry | null;
  file: File | null;
}

export interface BoqItemRow {
  item_no: string;
  description: string;
  unit: string;
  quantity: number;
  base_rate: number;
  current_amount: number;
  competitive_rate: number;
  optimized_amount: number;
  saving: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

export interface ScheduleOfCreditRow {
  sr: string | number;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Financials {
  total_items?: number;
  total_current?: number;
  calculated_value?: number;
  total_optimized?: number;
  optimized_value?: number;
  total_saving?: number;
  saving?: number;
  saving_pct?: number;
  estimated_cost?: number;
}

export interface WinProbability {
  current_win_probability?: number;
  optimized_win_probability?: number;
}

export interface ProjectInfo {
  name?: string;
}

export interface TenderAnalysisResponse {
  tender_type?: TenderType;
  project_name?: string;
  project_info?: ProjectInfo;
  financials?: Financials;
  win_probability?: WinProbability;
  ai_summary?: string;
  executive_summary?: string;
  category_breakdown?: Record<string, number>;
  resources?: {
    labour?: Array<[string, number] | { name: string; value: number }>;
    materials?: Array<[string, number] | { name: string; value: number }>;
    machinery?: Array<[string, number] | { name: string; value: number }>;
  };
  items?: BoqItemRow[];
  boq_items?: BoqItemRow[];
  schedule_of_credit?: ScheduleOfCreditRow[];
  /** Returned by `POST /api/tender/process` for session correlation and downloads. */
  session_id?: string;
  download_url?: string;
  output_file?: string;
  _docInfo?: { boq?: string; kb?: string; dsr?: string };
}

export interface ImmersiveData {
  filename: string;
  projectName: string;
  tenderType: TenderType;
  totalItems: number;
  calcValue: number;
  optValue: number;
  saving: number;
  savingPct: number;
  boqItems: BoqItemRow[];
  resources: TenderAnalysisResponse['resources'];
  catData: Record<string, number>;
  winCurr: number;
  winOpt: number;
  conf: { HIGH: number; MEDIUM: number; LOW: number };
  sheets: string[];
}

export interface OutputFileMeta {
  name: string;
  modified?: string;
  size_kb?: number;
  size_mb?: number;
  /** When provided by `/api/tender/outputs` or `/api/tender/output-files`. */
  download_url?: string;
}

export interface OutputFilesResponse {
  files?: OutputFileMeta[];
  output_dir?: string;
}

/** GET `/api/tender/status` */
export interface TenderStatusResponse {
  status?: string;
  engine?: boolean;
  dsr_rates_loaded?: boolean;
  azure_openai_configured?: boolean;
}

/** GET `/api/tender/outputs` */
export interface TenderOutputsListResponse {
  files?: OutputFileMeta[];
}

/** GET `/api/tender/dsr-rates` */
export interface DsrRateRow {
  description: string;
  unit: string;
  rate: number;
  chapter?: string;
}

export interface DsrRatesResponse {
  rates?: DsrRateRow[];
}

/** GET `/api/tender/categories` */
export interface TenderCategoriesResponse {
  categories?: string[];
  total?: number;
}
