/**
 * @file dfmea-header-map.ts
 * @description DFMEA Import·AllTab 컬럼 헤더 정규화 (PFMEA pfmea-header-map.ts 1:1 벤치마킹)
 *
 * @see docs/DFMEA 파이프라인  PFMEA 1대1 벤치마킹 전체 적용.md
 * @see src/lib/fmea/constants/pfmea-header-map.ts
 */

import { getFmeaLabels } from '@/lib/fmea-labels';

const lb = getFmeaLabels(true);

/**
 * DFMEA Import 컬럼 ID 정규화
 * PFMEA의 pfmea-header-map.ts와 동일 구조, DFMEA 컬럼명 적용
 *
 * 문서 원문 (132-136행) 기준:
 *   '다음 상위수준' → F1 (L1 구조명)
 *   '다음하위 수준' → D2 (3L 시트에서 초점요소 참조)
 *   '타입'         → E1 (4M에 대응하는 DFMEA 분류)
 */
export const DFMEA_COLUMN_IDS = {
  // L2 레벨 (초점요소)
  D1: '번호',              // PFMEA A1(공정번호)에 대응
  D2: '초점요소',           // PFMEA A2(공정명)에 대응
  D3: '초점요소 기능',      // PFMEA A3(공정기능)에 대응
  D4: '제품특성',           // PFMEA A4와 동일
  D5: '고장형태',           // PFMEA A5와 동일
  D6: '검출관리',           // PFMEA A6와 동일
  // L3 레벨 (부품)
  E1: '부품 또는 특성',     // PFMEA B1(작업요소)에 대응
  E2: '부품 기능 또는 특성', // PFMEA B2(요소기능)에 대응
  E3: '부품 요구사항',      // PFMEA B3(공정특성)에 대응
  E4: '고장원인',           // PFMEA B4와 동일
  E5: '예방관리',           // PFMEA B5와 동일
  // L1 레벨 (다음 상위수준)
  F1: '구분',              // PFMEA C1와 동일 (값: 법규/기본/보조)
  F2: '제품기능',           // PFMEA C2와 동일
  F3: '요구사항',           // PFMEA C3와 동일
  F4: '고장영향',           // PFMEA C4와 동일
} as const;

export type DfmeaColumnId = keyof typeof DFMEA_COLUMN_IDS;

// 모든 알려진 DFMEA 헤더 변형 → canonical ID
export const DFMEA_HEADER_NORMALIZE_MAP: Record<string, DfmeaColumnId> = {
  // === D1 번호 ===
  '번호': 'D1',
  'No': 'D1',
  'NO': 'D1',

  // === D2 초점요소 ===
  '초점요소': 'D2',
  '초점 요소': 'D2',

  // === D3 초점요소 기능 ===
  '초점요소 기능': 'D3',
  '초점요소기능': 'D3',

  // === D4 제품특성 ===
  '제품특성': 'D4',

  // === D5 고장형태 ===
  '고장형태': 'D5',
  '고장형태(FM)': 'D5',

  // === D6 검출관리 ===
  '검출관리': 'D6',

  // === E1 부품 또는 특성 ===
  '부품 또는 특성': 'E1',
  '부품': 'E1',

  // === E2 부품 기능 또는 특성 ===
  '부품 기능 또는 특성': 'E2',
  '부품기능': 'E2',

  // === E3 부품 요구사항 ===
  '부품 요구사항': 'E3',
  '부품요구사항': 'E3',

  // === E4 고장원인 ===
  '고장원인': 'E4',
  '고장원인(FC)': 'E4',

  // === E5 예방관리 ===
  '예방관리': 'E5',

  // === F1 구분 ===
  '구분': 'F1',

  // === F2 제품기능 ===
  '제품기능': 'F2',
  '제품 기능': 'F2',

  // === F3 요구사항 ===
  '요구사항': 'F3',

  // === F4 고장영향 ===
  '고장영향': 'F4',
  '고장영향(FE)': 'F4',

  // === 구조분석 전용 ===
  '다음 상위수준': 'F1',  // L1 구조명
  '다음상위수준': 'F1',
  '다음하위 수준': 'D2',  // 3L 시트에서 초점요소 참조
  '타입': 'E1',           // 4M에 대응하는 DFMEA 분류
};

export function normalizeDfmeaHeader(header: string): DfmeaColumnId | null {
  const trimmed = header.replace(/\s+/g, ' ').trim();
  return DFMEA_HEADER_NORMALIZE_MAP[trimmed] ?? null;
}

/**
 * DFMEA 코드 → 워크시트/Import 헤더 문자열 (PFMEA PFMEA_CODE_TO_HEADER 대응)
 * itemCode는 PFMEA A1~C4 유지; 값만 DFMEA 용어.
 */
export const DFMEA_CODE_TO_HEADER: Record<string, string> = {
  A1: DFMEA_COLUMN_IDS.D1,
  A2: DFMEA_COLUMN_IDS.D2,
  A3: DFMEA_COLUMN_IDS.D3,
  A4: DFMEA_COLUMN_IDS.D4,
  A5: DFMEA_COLUMN_IDS.D5,
  A6: DFMEA_COLUMN_IDS.D6,
  B1: DFMEA_COLUMN_IDS.E1,
  B2: DFMEA_COLUMN_IDS.E2,
  B3: DFMEA_COLUMN_IDS.E3,
  B4: DFMEA_COLUMN_IDS.E4,
  B5: DFMEA_COLUMN_IDS.E5,
  C1: DFMEA_COLUMN_IDS.F1,
  C2: DFMEA_COLUMN_IDS.F2,
  C3: DFMEA_COLUMN_IDS.F3,
  C4: DFMEA_COLUMN_IDS.F4,
};

// ── AllTab DFMEA 오버라이드용 그룹/컬럼명 (getFmeaLabels(true) + PRD 표기) ──

export const DFMEA_STRUCT_L1_GROUP = '다음 상위수준';
export const DFMEA_STRUCT_L1_NAME = lb.l1Short;

export const DFMEA_STRUCT_L2_GROUP = '초점 요소';
export const DFMEA_STRUCT_L2_NAME = "A'SSY";
export const DFMEA_STRUCT_L2_TYPE = lb.l3Attr;

export const DFMEA_STRUCT_L3_GROUP = '다음 하위수준';
export const DFMEA_STRUCT_L3_NAME = DFMEA_COLUMN_IDS.E1;

export const DFMEA_FUNC_L1_GROUP = '다음상위수준 기능';
export const DFMEA_FUNC_L1_C1_NAME = '분류';
export const DFMEA_FUNC_L1_C2_NAME = '제품 기능';
export const DFMEA_FUNC_L1_C3_NAME = lb.l2Char;

export const DFMEA_FUNC_L2_GROUP = '초점요소 기능 및 요구사항';
export const DFMEA_FUNC_L2_D3_NAME = lb.l2Func;
export const DFMEA_FUNC_L2_D4_NAME = lb.l2Char;

export const DFMEA_FUNC_L3_GROUP = '다음하위수준/특성유형';
export const DFMEA_FUNC_L3_E2_NAME = DFMEA_COLUMN_IDS.E2;
export const DFMEA_FUNC_L3_E3_NAME = '요구사항';

export const DFMEA_FAIL_FE_GROUP = '자동자/사용자 영향(FE)';
export const DFMEA_FAIL_FE_NAME = '고장영향';
export const DFMEA_FAIL_S_NAME = '심각도';

export const DFMEA_FAIL_FM_GROUP = '초점요소 고장 형태(FM)';
export const DFMEA_FAIL_FM_NAME = DFMEA_COLUMN_IDS.D5;

export const DFMEA_FAIL_FC_GROUP = '다음하위 수준 고장원인(FC)';
export const DFMEA_FAIL_FC_NAME = DFMEA_COLUMN_IDS.E4;

/**
 * 작업 8: DFMEA fill-down 대상 필드 (문서 표 — 파서/에디터 연계용 SSoT)
 * PFMEA carry와 별도로 문서화; position-parser 병합 셀 carry는 동일 물리 시트 기준.
 */
export const DFMEA_FILL_DOWN_RULES = {
  구조분석: ['다음 상위수준', '번호', '초점요소', '타입'],
  '1L_완제품기능': ['다음 상위수준', '구분'],
  '2L_초점요소기능': ['초점요소', '초점요소 기능'],
  '3L_부품기능': ['초점요소', '타입', '부품', '부품 기능 또는 특성'],
  '1L_고장영향': ['다음 상위수준', '구분', '제품기능', '요구사항'],
  '2L_고장형태': ['초점요소', '초점요소 기능', '제품특성'],
  '3L_고장원인': ['초점요소', '타입', '부품', '부품 기능 또는 특성'],
} as const;
