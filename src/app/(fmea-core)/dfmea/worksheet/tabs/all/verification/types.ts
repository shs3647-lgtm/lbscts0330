/**
 * @file types.ts
 * @description 역전개 검증 뷰 타입 정의
 */

/** 검증 뷰 모드 (null = 일반 ALL view) */
export type VerificationMode = 'FE' | 'FM' | 'FC' | null;

/** FE 검증 행 (1L 고장영향 역전개) */
export interface FlatFERow {
  feId: string;
  feCategory: string;       // 구분 (YP/SP/USER)
  feFunctionName: string;   // 완제품기능
  feRequirement: string;    // 요구사항
  feText: string;           // 고장영향(FE) 텍스트
  feSeverity: number;       // 심각도(S)
}

/** FM 검증 행 (2L 고장형태 역전개) */
export interface FlatFMRow {
  fmId: string;
  processNo: string;        // 공정번호
  processName: string;      // 공정명
  processFunction: string;  // 설계기능
  productChar: string;      // 설계특성
  fmText: string;           // 고장형태(FM) 텍스트
}

/** FC 검증 행 (3L 고장원인 역전개) */
export interface FlatFCRow {
  fcId: string;
  processNo: string;        // 공정번호
  processName: string;      // 공정명
  fcM4: string;             // 4M 분류
  fcWorkElem: string;       // 부품(컴포넌트)
  fcWorkFunction: string;   // 부품(컴포넌트)기능
  fcProcessChar: string;    // 설계파라미터
  fcText: string;           // 고장원인(FC) 텍스트
}

/** rowSpan 정보가 포함된 렌더링 행 */
export interface SpannedRow<T> {
  data: T;
  spans: Record<string, number>;  // 컬럼키 → rowSpan (0=병합됨/렌더링 스킵)
}

/** 검증 통계 (헤더 배지 + 셀 배경색용) */
export interface VerificationStats {
  ok: number;              // 적합 건수
  missing: number;         // 누락 건수
  duplicate: number;       // 중복 건수
  duplicateTexts: Set<string>;  // 중복 텍스트 목록 (셀 배경 판정용)
}
