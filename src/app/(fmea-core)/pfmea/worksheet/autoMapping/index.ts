/**
 * @file autoMapping/index.ts
 * @description 자동매핑 문지기(Gatekeeper) + 컬럼 스키마 + 트리뷰 미리보기 모듈
 */

export { COLUMN_SCHEMA } from './columnSchema';
export type { AutoMappingTab, MatchKeyType, ColumnSchemaDef, TabSchema } from './columnSchema';

export {
  buildRoomLocks,
  validateAutoMapping,
  groupMatchedByRoom,
  groupMatchedByRoomMeta,
} from './gatekeeper';
export type {
  RoomLock,
  DataKey,
  MatchedEntry,
  RejectedEntry,
  RejectionReason,
  GatekeeperResult,
} from './gatekeeper';

export { default as AutoMappingPreviewModal } from './AutoMappingPreviewModal';

export {
  protectStructure,
  ensureMinimumFunctions,
  ensureMinimumL2Functions,
  takeStructureSnapshot,
  validateStructuralIntegrity,
} from './structureGuard';
export type { StructureViolation } from './structureGuard';
