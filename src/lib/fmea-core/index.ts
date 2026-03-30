/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file fmea-core/index.ts
 * @description FMEA 공용 Core 라이브러리 메인 엔트리
 */

// Types
export * from './types';

// Hooks
export * from './hooks';

// Styles
export * from './styles';

// Utils
export * from './utils';

// Reverse-Import (역설계 시스템)
export * from './guards';
export * from './reverse-extract';
export * from './remap-fmeaid';
export * from './save-atomic';
export * from './compare-atomic';
export * from './generate-import-excel';
