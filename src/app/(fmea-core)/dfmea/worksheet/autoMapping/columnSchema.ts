/**
 * @file columnSchema.ts
 * @description 자동매핑 컬럼 스키마 — 각 탭/셀에 어떤 itemCode가 매핑되어야 하는지 정의
 * @created 2026-02-17
 *
 * ★ 호텔 비유:
 *   - 호텔(구조) = 구조분석에서 확정된 L2/L3 계층
 *   - 자물쇠 = 각 셀의 기대 매핑 기준 (processNo + m4 + itemCode)
 *   - 키 = 마스터 데이터의 processNo + m4 + itemCode + value
 */

// ============ 타입 정의 ============

/** 탭 식별자 */
export type AutoMappingTab =
  | 'function-l1'
  | 'function-l2'
  | 'function-l3'
  | 'failure-l1'
  | 'failure-l2'
  | 'failure-l3';

/** 매칭 키 타입 */
export type MatchKeyType =
  | 'value'           // C1: value 자체가 카테고리 (YP/SP/USER)
  | 'processNo'       // L2 탭: processNo로 매칭
  | 'processNo::m4'   // L3 탭: processNo + m4 복합키
  | 'category';       // L1 고장: processNo가 카테고리(YP/SP/USER) 역할

/** 컬럼 스키마 항목 */
export interface ColumnSchemaDef {
  field: string;          // state 내 대상 필드 경로
  itemCode: string;       // 기대하는 마스터 itemCode
  matchKey: MatchKeyType; // 매칭에 사용할 키 종류
  label: string;          // 한국어 컬럼명 (에러 메시지용)
}

/** 탭별 스키마 */
export interface TabSchema {
  columns: ColumnSchemaDef[];
  /** 이 탭에서 허용하는 itemCode 목록 (columns에서 추출) */
  allowedItemCodes: string[];
}

// ============ 스키마 정의 ============

const functionL1Schema: TabSchema = {
  columns: [
    { field: 'types[].name',                              itemCode: 'C1', matchKey: 'value',     label: '구분' },
    { field: 'types[].functions[].name',                   itemCode: 'C2', matchKey: 'processNo', label: '완제품기능' },
    { field: 'types[].functions[].requirements[].name',    itemCode: 'C3', matchKey: 'processNo', label: '요구사항' },
  ],
  allowedItemCodes: ['C1', 'C2', 'C3'],
};

const functionL2Schema: TabSchema = {
  columns: [
    { field: 'l2[].functions[].name',                      itemCode: 'A3', matchKey: 'processNo', label: '설계기능' },
    { field: 'l2[].functions[].productChars[].name',       itemCode: 'A4', matchKey: 'processNo', label: '설계특성' },
  ],
  allowedItemCodes: ['A3', 'A4'],
};

const functionL3Schema: TabSchema = {
  columns: [
    { field: 'l2[].l3[].functions[].name',                 itemCode: 'B2', matchKey: 'processNo::m4', label: '작업기능' },
    { field: 'l2[].l3[].functions[].processChars[].name',  itemCode: 'B3', matchKey: 'processNo::m4', label: '설계파라미터' },
  ],
  allowedItemCodes: ['B2', 'B3'],
};

const failureL1Schema: TabSchema = {
  columns: [
    { field: 'l1.failureScopes[].effect', itemCode: 'C4', matchKey: 'category', label: '고장영향(FE)' },
  ],
  allowedItemCodes: ['C4'],
};

const failureL2Schema: TabSchema = {
  columns: [
    { field: 'l2[].failureModes[].name', itemCode: 'A5', matchKey: 'processNo', label: '고장형태(FM)' },
  ],
  allowedItemCodes: ['A5'],
};

const failureL3Schema: TabSchema = {
  columns: [
    { field: 'l2[].failureCauses[].name', itemCode: 'B4', matchKey: 'processNo::m4', label: '고장원인(FC)' },
  ],
  allowedItemCodes: ['B4'],
};

/** 전체 탭별 컬럼 스키마 */
export const COLUMN_SCHEMA: Record<AutoMappingTab, TabSchema> = {
  'function-l1': functionL1Schema,
  'function-l2': functionL2Schema,
  'function-l3': functionL3Schema,
  'failure-l1': failureL1Schema,
  'failure-l2': failureL2Schema,
  'failure-l3': failureL3Schema,
};

// ============ itemCode 참조표 (문서용) ============

/**
 * itemCode 전체 참조표:
 *
 * | itemCode | 한국어명     | 탭           | 레벨 |
 * |----------|-------------|-------------|------|
 * | C1       | 구분         | 기능 1L     | L1   |
 * | C2       | 완제품기능    | 기능 1L     | L1   |
 * | C3       | 요구사항     | 기능 1L     | L1   |
 * | C4       | 고장영향(FE) | 고장 1L     | L1   |
 * | A3       | 설계기능     | 기능 2L     | L2   |
 * | A4       | 설계특성     | 기능 2L     | L2   |
 * | A5       | 고장형태(FM) | 고장 2L     | L2   |
 * | A6       | 설계검증 검출(DC) | 최적화      | L2   |
 * | B2       | 작업기능     | 기능 3L     | L3   |
 * | B3       | 설계파라미터     | 기능 3L     | L3   |
 * | B4       | 고장원인(FC) | 고장 3L     | L3   |
 * | B5       | 설계검증 예방(PC) | 최적화      | L3   |
 */
