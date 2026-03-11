/**
 * @file types.ts
 * @description 고장분석 탭 타입 정의
 */

import { WorksheetState } from '../../constants';

export interface FailureTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage: () => void;
}











