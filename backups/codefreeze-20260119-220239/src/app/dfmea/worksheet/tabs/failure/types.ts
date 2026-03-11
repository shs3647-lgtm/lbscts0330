// @ts-nocheck
/**
 * @file types.ts
 * @description 고장분석 탭 타입 정의
 */

import { WorksheetState } from '../../constants';

export interface FailureTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;  // ✅ stateRef 동기 업데이트 버전
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly?: () => void; // ✅ 성능 최적화용(localStorage only)
  saveAtomicDB?: () => void;
}













