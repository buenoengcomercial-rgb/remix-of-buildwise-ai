import { Task, ViewMode, DependencyType } from '@/types/project';

export interface BarInfo {
  left: number;
  width: number;
  isDelayed: boolean;
  isCritical: boolean;
  isComplete: boolean;
}

export interface FlatTask {
  task: Task;
  phaseId: string;
  phaseName: string;
  rowIndex: number;
}

export const DAY_WIDTH: Record<ViewMode, number> = { days: 28, weeks: 7, months: 2.5 };
export const ROW_HEIGHT = 32;

export const DEP_COLORS: Record<DependencyType, string> = {
  TI: 'hsl(230, 65%, 52%)',
  II: 'hsl(152, 60%, 42%)',
  TT: 'hsl(38, 92%, 50%)',
  IT: 'hsl(0, 72%, 51%)',
};
