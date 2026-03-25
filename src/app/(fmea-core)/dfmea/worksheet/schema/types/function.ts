/**
 * @file schema/types/function.ts
 * @description 기능분석 (3단계) 타입
 */

import { AtomicRecord } from './base';

// ============ 기능분석 (3단계) - Function Tables ============

/**
 * 1L 완제품 기능 (구분 → 기능 → 요구사항 통합)
 * - 상위: L1Structure (완제품 공정) - FK: l1StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L1Function extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l1StructId: string;     // FK: L1Structure.id (상위 구조분석)
    category: string;  // 구분 (YP/SP/USER — normalizeScope() 참조)
    functionName: string;   // 기능명
    requirement: string;    // 요구사항 (원자 단위)
}

/**
 * 2L 서브시스템 기능 (기능 → 설계특성 통합)
 * - 상위: L2Structure (서브시스템) - FK: l2StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L2Function extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l2StructId: string;     // FK: L2Structure.id (상위 구조분석 - 서브시스템)
    functionName: string;   // 기능명
    productChar: string;    // 설계특성 (원자 단위)
    specialChar?: string;   // 특별특성
}

/**
 * 3L 부품(컴포넌트) 기능 (기능 → 설계파라미터 통합)
 * - 상위: L3Structure (부품(컴포넌트)) - FK: l3StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L3Function extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l3StructId: string;     // FK: L3Structure.id (상위 구조분석 - 부품(컴포넌트))
    l2StructId: string;     // FK: L2Structure.id (연결용 - 서브시스템)
    functionName: string;   // 기능명
    processChar: string;    // 설계파라미터 (원자 단위)
    specialChar?: string;   // 특별특성
}
