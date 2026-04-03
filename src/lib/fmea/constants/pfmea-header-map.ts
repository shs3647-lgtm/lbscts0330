/**
 * @file pfmea-header-map.ts
 * @description PFMEA 워크시트 AllTab 컬럼 헤더 정규화 맵
 *
 * 목적:
 *   1. FMEA 코드(A1~C4) ↔ 컬럼 헤더 문자열 간 SSoT 유지
 *   2. 하드코딩된 헤더 문자열을 상수 참조로 교체
 *   3. PFMEA/DFMEA 전환 시 getFmeaLabels()와 연계
 *
 * 사용:
 *   allTabConstants.ts COLUMNS_BASE의 group/name 참조
 *
 * @see src/lib/fmea-labels.ts — getFmeaLabels() PFMEA/DFMEA 동적 라벨
 * @see docs/CODE_NAMESPACE_MAP.md — 앱별 itemCode 충돌 매핑
 */

import { getFmeaLabels } from '@/lib/fmea-labels';

const lb = getFmeaLabels(false);

// ── 구조분석 (2단계) 그룹/컬럼명 ──

export const STRUCT_L1_GROUP = `1. ${lb.l1}`;        // "1. 완제품 공정명"
export const STRUCT_L1_NAME = lb.l1Short;             // "완제품공정명"

export const STRUCT_L2_GROUP = `2. ${lb.l2}`;         // "2. 메인 공정명"
export const STRUCT_L2_NAME = lb.l2No;                // "NO+공정명"

export const STRUCT_L3_GROUP = `3. ${lb.l3}`;         // "3. 작업 요소명"
export const STRUCT_L3_ATTR_NAME = lb.l3Attr;         // "4M"
export const STRUCT_L3_NAME = lb.l3Short;             // "작업요소"

// ── 기능분석 (3단계) 그룹/컬럼명 ──

export const FUNC_L1_GROUP = `1. ${lb.l1FuncGroup}`;  // "1. 완제품 공정기능/요구사항"
export const FUNC_L1_C1_NAME = '구분';                 // C1: 구분
export const FUNC_L1_C2_NAME = lb.l1Func;              // C2: "완제품기능" ← 정규화 기준
export const FUNC_L1_C3_NAME = '요구사항';              // C3: 요구사항

export const FUNC_L2_GROUP = `2. ${lb.l2FuncGroup}`;   // "2. 메인공정기능 및 제품특성"
export const FUNC_L2_A3_NAME = lb.l2Func;               // A3: "공정기능" ← "공정 기능" 아닌 정규형
export const FUNC_L2_A4_NAME = lb.l2Char;               // A4: "제품특성"

export const FUNC_L3_GROUP = `3. ${lb.l3FuncGroup}`;   // "3. 작업요소의 기능 및 공정특성"
export const FUNC_L3_B2_NAME = `${lb.l3Short} 기능`;    // B2: "작업요소 기능"
export const FUNC_L3_B3_NAME = lb.l3Char;               // B3: "공정특성"

// ── 고장분석 (4단계) 그룹/컬럼명 ──

export const FAIL_FE_GROUP = '1. 고장영향(FE)';           // C4 그룹
export const FAIL_FE_NAME = '고장영향(FE)';                // C4: 고장영향
export const FAIL_S_NAME = '심각도(S)';

export const FAIL_FM_GROUP = '2. 고장형태(FM)';            // A5 그룹
export const FAIL_FM_NAME = '고장형태(FM)';                // A5: 고장형태

export const FAIL_FC_GROUP = '3. 고장원인(FC)';            // B4 그룹
export const FAIL_FC_NAME = '고장원인(FC)';                // B4: 고장원인

// ── 리스크분석 (5단계) 그룹/컬럼명 ──

export const RISK_PC_GROUP = '1. 현재 예방관리';           // B5 그룹
export const RISK_PC_NAME = '예방관리(PC)';                // B5: 예방관리
export const RISK_O_NAME = '발생도(O)';

export const RISK_DC_GROUP = '2. 현재 검출관리';           // A6 그룹
export const RISK_DC_NAME = '검출관리(DC)';                // A6: 검출관리
export const RISK_D_NAME = '검출도(D)';

export const RISK_EVAL_GROUP = '3. 리스크 평가';
export const RISK_AP_NAME = 'AP';
export const RISK_SC_NAME = '특별특성(SC)';
export const RISK_LLD_NAME = 'LLD';

// ── 최적화 (6단계) 그룹/컬럼명 ──

export const OPT_PLAN_GROUP = '1. 계획';
export const OPT_PC_IMPROVE_NAME = '예방관리개선';
export const OPT_DC_IMPROVE_NAME = '검출관리개선';
export const OPT_PERSON_NAME = '책임자성명';
export const OPT_TARGET_DATE_NAME = '목표완료일자';
export const OPT_STATUS_NAME = '상태';

export const OPT_MONITOR_GROUP = '2. 모니터링';
export const OPT_RESULT_NAME = '개선결과근거';
export const OPT_COMPLETE_DATE_NAME = '완료일자';

export const OPT_EVAL_GROUP = '3. 효과 평가';
export const OPT_S_NAME = '심각도(S)';
export const OPT_O_NAME = '발생도(O)';
export const OPT_D_NAME = '검출도(D)';
export const OPT_SC_NAME = '특별특성(SC)';
export const OPT_AP_NAME = 'AP';
export const OPT_NOTE_NAME = '비고';

/**
 * FMEA 코드 → 워크시트 컬럼 헤더 매핑 (PFMEA 기준)
 * Import 파이프라인의 itemCode와 워크시트 컬럼의 관계를 문서화
 */
export const PFMEA_CODE_TO_HEADER: Record<string, string> = {
  A1: '공정번호',
  A2: '공정명',
  A3: FUNC_L2_A3_NAME,   // 공정기능
  A4: FUNC_L2_A4_NAME,   // 제품특성
  A5: '고장형태',          // ← FAIL_FM_NAME='고장형태(FM)' 보다 짧은 약칭
  A6: '검출관리',
  B1: STRUCT_L3_NAME,     // 작업요소
  B2: '요소기능',
  B3: FUNC_L3_B3_NAME,    // 공정특성
  B4: '고장원인',
  B5: '예방관리',
  C1: FUNC_L1_C1_NAME,    // 구분
  C2: FUNC_L1_C2_NAME,    // 완제품기능 ← 정규화 기준 (제품기능 아님)
  C3: FUNC_L1_C3_NAME,    // 요구사항
  C4: '고장영향',
};
