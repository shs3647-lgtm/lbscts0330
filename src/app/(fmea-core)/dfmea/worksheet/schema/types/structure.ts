/**
 * @file schema/types/structure.ts
 * @description 구조분석 (2단계) 타입
 */

import { AtomicRecord } from './base';

// ============ 구조분석 (2단계) - Structure Tables ============

/**
 * 1L 완제품 공정 (최상위)
 * - 상위: 없음 (루트)
 * - 하위: L2Structure (서브시스템)
 */
export interface L1Structure extends AtomicRecord {
    fmeaId: string;       // FK: FMEA 프로젝트 ID
    name: string;         // 완제품 공정명
    // 확정 상태
    confirmed?: boolean;
}

/**
 * 2L 서브시스템
 * - 상위: L1Structure (완제품 공정) - FK: l1Id
 * - 하위: L3Structure (부품(컴포넌트))
 */
export interface L2Structure extends AtomicRecord {
    fmeaId: string;       // FK: FMEA 프로젝트 ID
    l1Id: string;         // FK: L1Structure.id (상위 완제품 공정)
    no: string;           // 공정 번호
    name: string;         // 공정명
    order: number;        // 순서
}

/**
 * 3L 부품(컴포넌트)
 * - 상위: L2Structure (서브시스템) - FK: l2Id
 * - 하위: 없음
 */
export interface L3Structure extends AtomicRecord {
    fmeaId: string;       // FK: FMEA 프로젝트 ID
    l1Id: string;         // FK: L1Structure.id (연결용)
    l2Id: string;         // FK: L2Structure.id (상위 서브시스템)
    m4: 'PC' | 'ME' | 'ET' | 'DE' | 'HMI' | 'MN' | 'MC' | 'IM' | 'EN' | '';  // DFMEA Interface Type + PFMEA 4M
    name: string;         // 부품(컴포넌트)명
    order: number;        // 순서
}
