/**
 * @file failure.ts
 * @description DFMEA 고장분석 탭 공용 타입
 */

import { WorksheetState } from '../../../app/(fmea-core)/dfmea/worksheet/constants';

export interface FailureTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly?: () => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  fmeaId?: string;
  customerName?: string;
  importCounts?: {
    processCount: number;
    productCharCount: number;
    fmCount: number;
    processCharCount: number;
    fcCount: number;
    loaded: boolean;
  };
}
