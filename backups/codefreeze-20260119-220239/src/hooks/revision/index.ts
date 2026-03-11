/**
 * @file hooks/revision/index.ts
 * @description 변경 히스토리 모듈 export (SOD + 확정)
 * @module revision
 * @created 2026-01-19
 * @updated 2026-01-19 - 확정 타입 추가
 */

// Types
export type {
  SODChangeType,
  ConfirmChangeType,
  ChangeType,
  SODHistoryRecord,
  ConfirmHistoryRecord,
  ChangeHistoryRecord,
  CreateSODHistoryRequest,
  SODHistoryResponse,
  OfficialRevisionRequest,
  SODValues,
  SODSnapshot,
  SODHistoryState,
  UseSODHistoryReturn,
} from './types';

export { 
  SOD_TYPE_LABELS, 
  CONFIRM_TYPE_LABELS, 
  CHANGE_TYPE_LABELS,
  isSODRecord,
  isConfirmRecord,
} from './types';

// Hooks
export { useSODHistory, detectSODChanges } from './useSODHistory';
export { default } from './useSODHistory';
