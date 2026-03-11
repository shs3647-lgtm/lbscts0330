/**
 * @file schema/index.ts
 * @description FMEA 스키마 모듈 export
 */

// 타입
export * from './types';

// 유틸리티
export { uid, createEmptyDB, linkFunctionToStructure, linkFailureToFunction, confirmStep } from './utils';

// 원본 schema.ts에서 나머지 함수들 re-export (validation, getLinkedDataByFK, flattenDB 등)
// 이 함수들은 아직 분리되지 않아 원본에서 직접 import
