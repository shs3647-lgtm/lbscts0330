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
    category: 'Your Plant' | 'Ship to Plant' | 'User';  // 구분
    functionName: string;   // 기능명
    requirement: string;    // 요구사항 (원자 단위)
}

/**
 * 2L 메인공정 기능 (기능 → 제품특성 통합)
 * - 상위: L2Structure (메인공정) - FK: l2StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L2Function extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l2StructId: string;     // FK: L2Structure.id (상위 구조분석 - 메인공정)
    functionName: string;   // 기능명
    productChar: string;    // 제품특성 (원자 단위)
    specialChar?: string;   // 특별특성
}

/**
 * 3L 작업요소 기능 (기능 → 공정특성 통합)
 * - 상위: L3Structure (작업요소) - FK: l3StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L3Function extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l3StructId: string;     // FK: L3Structure.id (상위 구조분석 - 작업요소)
    l2StructId: string;     // FK: L2Structure.id (연결용 - 메인공정)
    functionName: string;   // 기능명
    processChar: string;    // 공정특성 (원자 단위)
    specialChar?: string;   // 특별특성
}
