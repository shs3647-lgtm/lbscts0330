/**
 * @file types.ts
 * @description 워크시트 훅 공용 타입 정의
 * @version 1.0.0
 */

import type { 
  WorksheetState, 
  FMEAProject, 
  FlatRow 
} from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { 
  FMEAWorksheetDB, 
  FlattenedRow 
} from '@/app/(fmea-core)/pfmea/worksheet/schema';

// ============ Core State Types ============

export interface WorksheetCoreState {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;
  stateRef: React.MutableRefObject<WorksheetState>;
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  lastSaved: string;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
  isHydrated: boolean;
}

// ============ DB Types ============

export interface WorksheetDBState {
  atomicDB: FMEAWorksheetDB | null;
  setAtomicDB: React.Dispatch<React.SetStateAction<FMEAWorksheetDB | null>>;
  saveAtomicDB: (force?: boolean) => Promise<void>;
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly: () => void;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
}

// ============ FMEA List Types ============

export interface WorksheetFMEAListState {
  fmeaList: FMEAProject[];
  setFmeaList: React.Dispatch<React.SetStateAction<FMEAProject[]>>;
  currentFmea: FMEAProject | null;
  setCurrentFmea: React.Dispatch<React.SetStateAction<FMEAProject | null>>;
  selectedFmeaId: string | null;
  handleFmeaChange: (fmeaId: string) => void;
}

// ============ Row Calculation Types ============

export interface WorksheetRowsState {
  rows: FlatRow[];
  flattenedRows: FlattenedRow[];
  l1Spans: number[];
  l1TypeSpans: number[];
  l1FuncSpans: number[];
  l2Spans: number[];
}

// ============ Handlers Types ============

export interface WorksheetHandlers {
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  handleInputBlur: () => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  addL2: () => void;
  addL3: (l2Id: string) => void;
  deleteL2: (l2Id: string) => void;
  deleteL3: (l2Id: string, l3Id: string) => void;
  handleProcessSelect: (selectedProcesses: Array<{ processNo: string; processName: string }>) => void;
}

// ============ Combined Return Type ============

export interface UseWorksheetStateReturn extends 
  Omit<WorksheetCoreState, 'stateRef' | 'setIsSaving' | 'setLastSaved' | 'isHydrated'>,
  Omit<WorksheetDBState, 'setAtomicDB' | 'suppressAutoSaveRef'>,
  WorksheetFMEAListState,
  WorksheetRowsState,
  WorksheetHandlers {}

// ============ Config Types ============

export interface WorksheetConfig {
  fmeaType: 'PFMEA' | 'DFMEA';
  localStoragePrefix: string;
  apiEndpoint: string;
}

export const PFMEA_CONFIG: WorksheetConfig = {
  fmeaType: 'PFMEA',
  localStoragePrefix: 'pfmea',
  apiEndpoint: '/api/pfmea',
};

export const DFMEA_CONFIG: WorksheetConfig = {
  fmeaType: 'DFMEA',
  localStoragePrefix: 'dfmea',
  apiEndpoint: '/api/dfmea',
};
