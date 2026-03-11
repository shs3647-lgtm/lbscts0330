/**
 * @file hooks/sync/index.ts
 * @description 동기화 훅 모듈 통합 export
 * @module sync
 */

// ============================================================================
// 타입 export
// ============================================================================

export type {
  SyncDirection,
  SyncType,
  SyncStatus,
  ConflictPolicy,
  ConflictResolution,
  SyncConflict,
  FieldMapping,
  StructureSyncRequest,
  DataSyncRequest,
  SyncResponse,
  SyncHookState,
  UseSyncReturn,
  FmeaL2ForSync,
  FmeaL3ForSync,
  CharacteristicForSync,
  CpItemForSync,
} from './types';

// ============================================================================
// 상수 export
// ============================================================================

export {
  SYNC_FIELD_MAPPINGS,
  getBidirectionalFields,
  getFmeaToCpFields,
  getCpToFmeaFields,
} from './types';

// ============================================================================
// 훅 export
// ============================================================================

export { useSyncFmeaToCp } from './useSyncFmeaToCp';
export { useSyncCpToFmea } from './useSyncCpToFmea';
export { useDataSync } from './useDataSync';

// ============================================================================
// default export (편의용)
// ============================================================================

export { useSyncFmeaToCp as default } from './useSyncFmeaToCp';
