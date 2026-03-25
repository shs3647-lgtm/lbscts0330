/**
 * @file schema/types/failure.ts
 * @description 고장분석 (4단계) 타입
 */

import { AtomicRecord } from './base';

// ============ 고장분석 (4단계) - Failure Tables ============

/**
 * 1L 고장영향 (Failure Effect - FE)
 * - 상위: L1Function (요구사항) - FK: l1FuncId
 * - 연결: FailureLink를 통해 FM과 연결
 */
export interface FailureEffect extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l1FuncId: string;       // FK: L1Function.id (상위 기능분석 - 요구사항)
    category: string;  // 구분 (YP/SP/USER — normalizeScope() 참조)
    effect: string;         // 고장영향 내용
    severity: number;       // 심각도 (1-10)
}

/**
 * 2L 고장형태 (Failure Mode - FM) - 중심축
 * - 상위: L2Function (설계특성) - FK: l2FuncId
 * - 연결: FailureLink를 통해 FE, FC와 연결
 */
export interface FailureMode extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l2FuncId: string;       // FK: L2Function.id (상위 기능분석 - 설계특성)
    l2StructId: string;     // FK: L2Structure.id (서브시스템 - 역전개용)
    productCharId?: string; // FK: productChar.id (설계특성 연결용)
    mode: string;           // 고장형태 내용
    specialChar?: boolean;  // 특별특성 여부
}

/**
 * 3L 고장원인 (Failure Cause - FC)
 * - 상위: L3Function (설계파라미터) - FK: l3FuncId
 * - 연결: FailureLink를 통해 FM과 연결
 */
export interface FailureCause extends AtomicRecord {
    fmeaId: string;         // FK: FMEA 프로젝트 ID
    l3FuncId: string;       // FK: L3Function.id (상위 기능분석 - 설계파라미터)
    l3StructId: string;     // FK: L3Structure.id (부품(컴포넌트) - 역전개용)
    l2StructId: string;     // FK: L2Structure.id (서브시스템 - 연결용)
    processCharId?: string; // FK: 설계파라미터 ID
    cause: string;          // 고장원인 내용
    occurrence?: number;    // 발생도 (1-10)
}

/**
 * 고장분석 통합 데이터 (FailureAnalysis)
 * - 고장연결 결과 + 역전개 기능분석 + 역전개 구조분석 통합 저장
 */
export interface FailureAnalysis extends AtomicRecord {
    fmeaId: string;
    linkId: string;

    // 고장연결 정보
    fmId: string;
    fmText: string;
    fmProcessName: string;

    feId: string;
    feText: string;
    feCategory: string;
    feSeverity: number;

    fcId: string;
    fcText: string;
    fcOccurrence?: number;
    fcWorkElementName: string;
    fcM4?: string;

    // 역전개 기능분석 정보
    l1FuncId: string;
    l1Category: string;
    l1FuncName: string;
    l1Requirement: string;

    l2FuncId: string;
    l2FuncName: string;
    l2ProductChar: string;
    l2SpecialChar?: string;

    l3FuncId: string;
    l3FuncName: string;
    l3ProcessChar: string;
    l3SpecialChar?: string;

    // 역전개 구조분석 정보
    l1StructId: string;
    l1StructName: string;

    l2StructId: string;
    l2StructNo: string;
    l2StructName: string;

    l3StructId: string;
    l3StructM4?: string;
    l3StructName: string;

    // 메타데이터
    order: number;
    confirmed: boolean;
}

/**
 * 고장연결 (FM을 중심으로 FE, FC 연결)
 */
export interface FailureLink extends AtomicRecord {
    fmeaId: string;

    fmId: string;
    fmSeq?: number;

    feId: string;
    feSeq?: number;

    fcId: string;
    fcSeq?: number;

    fmPath?: string;
    fePath?: string;
    fcPath?: string;

    cache?: {
        fmText: string;
        fmProcess: string;
        feText: string;
        feCategory: string;
        feSeverity: number;
        fcText: string;
        fcWorkElem: string;
        fcProcess: string;
    };
}
