/**
 * @file schema/types/base.ts
 * @description 기본 원자 단위 타입
 * 
 * ★★★ 2026-02-05: 원자성 DB 정합성 강화 ★★★
 * - rowIndex, colIndex 추가: 워크시트 셀 위치 정보
 * - CP/PFD 연동 시 정확한 위치 기반 매핑 지원
 */

// ============ 기본 원자 단위 ============
export interface AtomicRecord {
    id: string;           // 고유 ID (PK) - 하이브리드 포맷: {FMEA_SEQ}-{TYPE}-{PATH}-{SEQ}
    createdAt?: string;   // 생성일
    updatedAt?: string;   // 수정일

    // ★★★ 셀 위치 정보 (2026-02-05 추가) ★★★
    rowIndex?: number;    // 행 인덱스 (워크시트 내 위치)
    colIndex?: number;    // 열 인덱스 (워크시트 내 위치)

    // ★★★ 모자관계 (부모-자식) ★★★
    parentId?: string;    // 부모 ID (계층 추적용)

    // ★★★ 병합 그룹 (같은 그룹 = 같은 데이터) ★★★
    mergeGroupId?: string;  // 병합 그룹 ID
    rowSpan?: number;       // 병합된 행 수 (1 = 비병합)
    colSpan?: number;       // 병합된 열 수 (1 = 비병합)
}
