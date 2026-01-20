
export interface UserStats {
  steps: number;
  calories: number;
  sleep: number; // hours
  heartRate: number;
  water: number; // ml
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  MASTERS = 'MASTERS',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  PROJECT_PERMISSIONS = 'PROJECT_PERMISSIONS',
  PR_MANAGEMENT = 'PR_MANAGEMENT',
  REPORTS = 'REPORTS',
  LABOUR_MANAGEMENT = 'LABOUR_MANAGEMENT',
  AI_COACH = 'AI_COACH'
}

export type ThemeType = 'dark' | 'light';
