/**
 * @file schema/index.ts
 * @description FMEA 스키마 모듈 통합 진입점
 * 
 * 모듈화된 구조:
 * - types/     : 타입 정의
 * - utils/     : 유틸리티 함수
 * - validators/: 검증 함수
 * - transforms/: 평탄화 함수
 */

// ============ 타입 ============
export * from './types';

// ============ 유틸리티 ============
export * from './utils';

// ============ 검증 ============
export * from './validators';

// ============ 변환 ============
// export * from './transforms';  // TODO: flattenDB 분리 후 활성화
