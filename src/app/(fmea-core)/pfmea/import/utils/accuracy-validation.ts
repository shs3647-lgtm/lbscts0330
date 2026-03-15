/**
 * @file accuracy-validation.ts
 * @description PFMEA 기초정보 작성정확도 검증 (지침서 v2.0 + v13.3 교정 반영)
 * 항목 간 혼입 검출, 형식 검증, B5↔A6 교차 검증, B4/FC 동사형·매칭 검증
 * @created 2026-03-13
 * @updated 2026-03-14 — v13.3 신규 규칙 8건 추가
 *
 * 검증 규칙 (warning):
 *   MIX_A4_B3        — A4(제품특성)에 공정 파라미터(B3) 키워드 혼입
 *   A4_ACTION_VERB   — A4에 Check/Inspection 행위형 표현 ★v13.3
 *   MIX_A5_CAUSE     — A5(고장형태)에 고장원인(B4) 키워드 혼입
 *   MIX_A5_EFFECT    — A5에 고장영향(C4) 키워드 혼입 ★v13.3
 *   A5_FM_PLACEHOLDER — A5에 'FM'/'TBD' 플레이스홀더 ★v13.3
 *   MIX_B4_SYMPTOM   — B4(고장원인)에 고장형태(A5) 키워드 혼입
 *   VERB_A4_A5       — A4/A5에 동사형 표현 사용
 *   B1_NAMING_ERROR  — B1에 설비명이 아닌 관리항목/상태명 ★v13.3
 *   A3_PROCEDURE_LISTING — A3 절차서 문장 나열 ★v13.3
 *   B2_PROCEDURE_LISTING — B2 절차서 문장 나열 ★v13.3
 *   MIX_B5_A6        — B5(예방)↔A6(검출) 교차 혼입
 *   MATCH_B1_WE      — B1↔FC(WE) 표기 불일치
 *
 * 검증 규칙 (error — Import 전 반드시 수정):
 *   B4_VERB_ENDING   — B4/FC에 동사형 종결 ★v13.3
 *   FC_B4_MISMATCH   — FC 고장원인이 B4 기준값에 없음 ★v13.3
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';

export type AccuracyLevel = 'warning' | 'error';

export interface AccuracyWarning {
  ruleId: string;
  itemCode: string;
  processNo: string;
  value: string;
  message: string;
  /** 'error' = Import 전 반드시 수정, 'warning' = 경고만 (기본값) */
  level: AccuracyLevel;
}

// ── A4에 혼입되면 안 되는 공정 파라미터 키워드 (B3 영역) ──
const B3_KEYWORDS = [
  'temperature', 'temp', '온도', '농도', 'concentration',
  'energy', 'resistivity', 'rf ', 'power', 'recipe',
  '전류', '압력', 'pressure', 'flow', 'rpm',
  'wt%', 'mω', 'mj', '°c', 'a·hr', 'a/hr',
  'time', '시간', 'speed', '속도', '유량',
];

// ── A5에 혼입되면 안 되는 원인 키워드 (B4 영역) ──
const B4_KEYWORDS = [
  '미준수', '미실시', '오설정', '오적용', 'teaching 불량',
  'recipe 오', 'pm 미', '누락', '혼동', '미숙지',
  '미점검', '노후', '마모', '열화', '수명 초과',
  'life time', '미교체', '설정 오류', '교정 미',
];

// ── B4에 혼입되면 안 되는 이탈 현상 키워드 (A5 영역) ──
const A5_KEYWORDS = [
  '규격 이탈', '미형성', '부재', '잔류',
  'scratch', '파손', '크랙', 'chipping', 'crack',
  'spec out', 'under-spec', 'over-spec', 'missing',
  '불만족', '미검출', '유출',
];
// ── B4 원인 맥락 키워드 — A5 키워드와 함께 있으면 정당한 원인 기술 (false positive 방지) ──
const B4_CAUSE_CONTEXT = [
  '미준수', '미실시', '오설정', '오적용', '미숙지', '미점검',
  '노후', '마모', '열화', '수명', '미교체', '누락', '혼동',
  '부족', '과다', '오류', '불량', '관리', '교정',
  '미조치', '인한', '때문', '원인', '발생',
];

// ── A4에서 금지되는 행위형 키워드 (Check/Inspection) ── ★v13.3
const A4_ACTION_KEYWORDS = [
  'check', 'inspection', 'test', 'monitor',
  '확인', '검사', '점검', '모니터링', '측정',
];

// ── A5에 혼입되면 안 되는 고장영향(C4) 키워드 ── ★v13.3
const C4_EFFECT_KEYWORDS = [
  '불량 유출', '유출', '고객 불만', '수율 손실',
  '라인 정지', '리콜', '납기 지연', '원가 상승',
  '고객 수령', '시장 유출',
];

// ── A5에서 금지되는 플레이스홀더 ── ★v13.3
const A5_PLACEHOLDERS = ['fm', 'tbd', '해당없음', '해당 없음', 'n/a', 'na', '-'];

// ── B1에서 금지되는 관리항목/상태명 키워드 ── ★v13.3
const B1_INVALID_KEYWORDS = [
  '관리', '상태 유지', '유지', 'check', '확인',
];

// ── A4/A5에서 금지되는 동사형 표현 ──
const VERB_PATTERNS = [
  /check$/i, /inspection$/i, /진행$/,
  /확인하다$/, /검사하다$/, /한다$/, /한다\.?$/,
  /측정$/, /모니터링$/,
];

// ── B4/FC에서 금지되는 동사형 종결 패턴 ── ★v13.3
const B4_VERB_ENDING_PATTERNS = [
  /한다\.?$/, /않는다\.?$/, /진행함\.?$/, /않음\.?$/,
  /않는다$/, /못한다$/, /한다$/, /않음$/,
  /진행한다$/, /하지 않는다$/, /하지 않음$/,
  /을 진행함$/, /를 진행함$/,
];

// ── B5(예방)에 혼입되면 안 되는 검출 키워드 ──
const DETECTION_IN_B5 = [
  '검사', '측정', '검출', 'inspection', 'measurement',
  '캘리퍼스', 'probe', 'scope', 'avi', '전수검사',
];

// ── A6(검출)에 혼입되면 안 되는 예방 키워드 ──
const PREVENTION_IN_A6 = [
  '교육', 'sop', '예방', '점검 계획', '숙련도',
  '인증 시험', '게시', '표준서', '작업표준',
];

// ── B5 예방 맥락 키워드 — 검출 키워드와 함께 나오면 예방 조치로 판단 (false positive 방지) ──
const B5_PREVENTIVE_CONTEXT = [
  '교정', 'calibration', '교육', 'training', 'pm', '예방', '보전',
  '관리', '점검', '강화', '확인', '평가', '숙련도', 'msa',
];

function containsAny(value: string, keywords: string[]): string | null {
  const lower = value.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(value));
}

/**
 * flatData 기반 항목별 작성정확도 검증
 * SA 확정 시 호출하여 혼입/형식 경고를 수집
 */
export function validateAccuracy(flatData: ImportedFlatData[]): AccuracyWarning[] {
  const warnings: AccuracyWarning[] = [];

  for (const item of flatData) {
    const val = (item.value || '').trim();
    if (!val) continue;

    // ── MIX_A4_B3: A4에 공정 파라미터 키워드 혼입 ──
    if (item.itemCode === 'A4') {
      const hit = containsAny(val, B3_KEYWORDS);
      if (hit) {
        warnings.push({
          ruleId: 'MIX_A4_B3',
          itemCode: 'A4',
          processNo: item.processNo,
          value: val,
          message: `A4(제품특성)에 공정특성(B3) 키워드 "${hit}" 혼입 의심`,
          level: 'warning',
        });
      }
    }

    // ── A4_ACTION_VERB: A4에 Check/Inspection 행위형 ── ★v13.3
    if (item.itemCode === 'A4') {
      const hit = containsAny(val, A4_ACTION_KEYWORDS);
      if (hit) {
        warnings.push({
          ruleId: 'A4_ACTION_VERB',
          itemCode: 'A4',
          processNo: item.processNo,
          value: val,
          message: `A4(제품특성)에 행위형 키워드 "${hit}" — 측정 가능한 품질특성 명사로 수정`,
          level: 'warning',
        });
      }
    }

    // ── MIX_A5_CAUSE: A5에 원인 키워드 혼입 ──
    if (item.itemCode === 'A5') {
      const hit = containsAny(val, B4_KEYWORDS);
      if (hit) {
        warnings.push({
          ruleId: 'MIX_A5_CAUSE',
          itemCode: 'A5',
          processNo: item.processNo,
          value: val,
          message: `A5(고장형태)에 고장원인(B4) 키워드 "${hit}" 혼입 의심`,
          level: 'warning',
        });
      }
    }

    // ── MIX_A5_EFFECT: A5에 고장영향(C4) 키워드 혼입 ── ★v13.3
    if (item.itemCode === 'A5') {
      const hit = containsAny(val, C4_EFFECT_KEYWORDS);
      if (hit) {
        warnings.push({
          ruleId: 'MIX_A5_EFFECT',
          itemCode: 'A5',
          processNo: item.processNo,
          value: val,
          message: `A5(고장형태)에 고장영향(C4) 키워드 "${hit}" 혼입 — A5는 공정 내 현상만 기재`,
          level: 'warning',
        });
      }
    }

    // ── A5_FM_PLACEHOLDER: A5에 'FM'/'TBD' 플레이스홀더 ── ★v13.3
    if (item.itemCode === 'A5') {
      const valLower = val.toLowerCase();
      if (A5_PLACEHOLDERS.includes(valLower)) {
        warnings.push({
          ruleId: 'A5_FM_PLACEHOLDER',
          itemCode: 'A5',
          processNo: item.processNo,
          value: val,
          message: `A5(고장형태)에 플레이스홀더 "${val}" 사용 금지 — [A4 특성명]+[이탈 유형] 형식으로 기재`,
          level: 'warning',
        });
      }
    }

    // ── MIX_B4_SYMPTOM: B4에 이탈 현상 키워드 혼입 (원인 맥락 있으면 허용) ──
    if (item.itemCode === 'B4') {
      const hit = containsAny(val, A5_KEYWORDS);
      if (hit) {
        // B4 원인 맥락 키워드가 함께 있으면 정당한 원인 기술 → false positive 방지
        const hasCauseContext = containsAny(val, B4_CAUSE_CONTEXT);
        if (!hasCauseContext) {
          warnings.push({
            ruleId: 'MIX_B4_SYMPTOM',
            itemCode: 'B4',
            processNo: item.processNo,
            value: val,
            message: `B4(고장원인)에 고장형태(A5) 키워드 "${hit}" 혼입 의심`,
            level: 'warning',
          });
        }
      }
    }

    // ── B4_VERB_ENDING: B4에 동사형 종결 (~한다/~않음) ── ★v13.3 (Error 레벨)
    if (item.itemCode === 'B4' && matchesAnyPattern(val, B4_VERB_ENDING_PATTERNS)) {
      warnings.push({
        ruleId: 'B4_VERB_ENDING',
        itemCode: 'B4',
        processNo: item.processNo,
        value: val,
        message: `B4(고장원인)에 동사형 종결 — 명사형 3대 패턴 사용: [이탈형/인과형/누락형]`,
        level: 'error',
      });
    }

    // ── VERB_A4_A5: A4/A5에 동사형 표현 ──
    if ((item.itemCode === 'A4' || item.itemCode === 'A5') && matchesAnyPattern(val, VERB_PATTERNS)) {
      warnings.push({
        ruleId: 'VERB_A4_A5',
        itemCode: item.itemCode,
        processNo: item.processNo,
        value: val,
        message: `${item.itemCode}는 명사형으로 작성해야 합니다 (동사형 표현 감지)`,
        level: 'warning',
      });
    }

    // ── B1_NAMING_ERROR: B1에 관리항목/상태명 기재 ── ★v13.3
    if (item.itemCode === 'B1') {
      const hit = containsAny(val, B1_INVALID_KEYWORDS);
      if (hit) {
        warnings.push({
          ruleId: 'B1_NAMING_ERROR',
          itemCode: 'B1',
          processNo: item.processNo,
          value: val,
          message: `B1(작업요소)에 관리항목/상태명 "${hit}" — 설비·재료·인원 고유명칭으로 수정`,
          level: 'warning',
        });
      }
    }

    // ── A3_PROCEDURE_LISTING: A3 절차서 문장 나열 ── ★v13.3
    if (item.itemCode === 'A3' && val.length > 80) {
      warnings.push({
        ruleId: 'A3_PROCEDURE_LISTING',
        itemCode: 'A3',
        processNo: item.processNo,
        value: val.slice(0, 60) + '…',
        message: `A3(공정기능)이 ${val.length}자 — 절차서 나열 의심. "[대상]을 [방법]으로 [처리]하여 [결과]" 형식 권장`,
        level: 'warning',
      });
    }

    // ── B2_PROCEDURE_LISTING: B2 절차서 문장 나열 ── ★v13.3
    if (item.itemCode === 'B2' && val.length > 80) {
      warnings.push({
        ruleId: 'B2_PROCEDURE_LISTING',
        itemCode: 'B2',
        processNo: item.processNo,
        value: val.slice(0, 60) + '…',
        message: `B2(요소기능)이 ${val.length}자 — 절차서 나열 의심. "[B1 명칭]이 [행위]하여 [결과]" 형식 권장`,
        level: 'warning',
      });
    }
  }

  return warnings;
}

// ── A6 검출관리 3요소 판별 키워드 ──
const DC_EQUIPMENT_KEYWORDS = [
  'scope', 'probe', '측정기', '시험기', '검사기', 'avi', 'aoi', 'cmm',
  'gauge', '게이지', 'caliper', '캘리퍼', '마이크로미터', 'interlock',
  '카메라', 'camera', '비전', 'vision', 'scanner', '스캐너', 'eol',
  'nanospec', 'stratus', '두께계', '시험장비', '측정장비',
  // v5.9: Au BUMP 공정 장비 키워드 보강
  'sem', 'kla', '현미경', 'microscope', 'xrf', '카운터', 'counter',
  '분석기', 'analyzer', '체크리스트',
  // v5.10: 육안 검사 장비 인정 + PLC/인라인 보강
  '육안', 'plc', '인라인',
];
const DC_METHOD_KEYWORDS = [
  '전수', '샘플링', 'sampling', 'lot별', '매lot', 'daily', '검사', '측정',
  '파괴검사', '비파괴', 'ndt', '육안', '자동', 'auto', '인라인',
  // v5.9: 검사방법 키워드 보강
  '모니터링', '확인', '분석', '검증', 'monitoring',
];
const DC_FREQ_KEYWORDS = [
  '전수', 'lot', 'daily', '매일', '1회', '분기', '주기', '월', '연',
  'every', '실시간', 'inline', '샘플', 'aql', 'points', 'wfr',
  // v5.9: 빈도 키워드 보강
  '정기', '매회', '100%', '이중',
];

// ── B5 예방관리 시스템/장치/절차 판별 키워드 ──
const PC_SYSTEM_KEYWORDS = [
  'interlock', '인터록', 'poka-yoke', '포카요케', 'spc', 'mes',
  'sop', '표준서', '작업표준', '관리도', '교정', 'calibration',
  'pm', '예방보전', '교육', '인증', '시스템', '모니터링', '자동제어',
  '점검', '관리', '계획', '기준', '절차', '가이드', '알람',
  // v5.9: 분석·보정 키워드 보강
  '분석', '보정', '자동',
];

/**
 * FC 고장사슬 기반 B5↔A6 교차 검증 + B1↔WE 표기 일치 + DC/PC 형식 검증
 */
export function validateFCAccuracy(
  flatData: ImportedFlatData[],
  chains: MasterFailureChain[],
): AccuracyWarning[] {
  const warnings: AccuracyWarning[] = [];

  // ── FC_B4_MISMATCH 준비: B4 기준값 집합 구축 ── ★v13.3
  const b4ValueSet = new Set<string>();
  for (const item of flatData) {
    if (item.itemCode === 'B4' && item.value?.trim()) {
      b4ValueSet.add(item.value.trim());
    }
  }

  for (const chain of chains) {
    // ── MIX_B5_A6: B5에 검출 키워드 (예방 맥락이면 제외) ──
    const pc = (chain.pcValue || '').trim();
    if (pc) {
      const hit = containsAny(pc, DETECTION_IN_B5);
      if (hit) {
        // 예방 맥락 키워드가 함께 있으면 false positive — 교정/교육/PM 등은 예방 조치
        const hasPreventiveContext = containsAny(pc, B5_PREVENTIVE_CONTEXT);
        if (!hasPreventiveContext) {
          warnings.push({
            ruleId: 'MIX_B5_A6',
            itemCode: 'B5',
            processNo: chain.processNo || '',
            value: pc,
            message: `B5(예방관리)에 검출 키워드 "${hit}" 혼입 → A6으로 이동 검토`,
            level: 'warning',
          });
        }
      }
    }

    // ── MIX_B5_A6: A6에 예방 키워드 ──
    const dc = (chain.dcValue || '').trim();
    if (dc) {
      const hit = containsAny(dc, PREVENTION_IN_A6);
      if (hit) {
        warnings.push({
          ruleId: 'MIX_B5_A6',
          itemCode: 'A6',
          processNo: chain.processNo || '',
          value: dc,
          message: `A6(검출관리)에 예방 키워드 "${hit}" 혼입 → B5로 이동 검토`,
          level: 'warning',
        });
      }
    }

    // ── FMT_A6_3ELEM: A6 검출관리 3요소(장비+방법+빈도) 확인 ──
    if (dc && dc.length >= 3) {
      const dcLower = dc.toLowerCase();
      const hasEquip = DC_EQUIPMENT_KEYWORDS.some(kw => dcLower.includes(kw));
      const hasMethod = DC_METHOD_KEYWORDS.some(kw => dcLower.includes(kw));
      const hasFreq = DC_FREQ_KEYWORDS.some(kw => dcLower.includes(kw));
      const missing: string[] = [];
      if (!hasEquip) missing.push('장비명');
      if (!hasMethod) missing.push('검사방법');
      if (!hasFreq) missing.push('빈도');
      if (missing.length > 0) {
        warnings.push({
          ruleId: 'FMT_A6_3ELEM',
          itemCode: 'A6',
          processNo: chain.processNo || '',
          value: dc,
          message: `A6(검출관리)에 ${missing.join('·')} 누락 — [장비명]+[방법]+[빈도] 3요소 필수`,
          level: 'warning',
        });
      }
    }

    // ── LEN_A6_SHORT: A6 최소 길이 ──
    if (dc && dc.length > 0 && dc.length < 5) {
      warnings.push({
        ruleId: 'LEN_A6_SHORT',
        itemCode: 'A6',
        processNo: chain.processNo || '',
        value: dc,
        message: `A6(검출관리) "${dc}" — 내용이 너무 짧음 (5자 이상 권장)`,
        level: 'warning',
      });
    }

    // ── FMT_B5_SYSTEM: B5 예방관리 시스템/장치/절차 포함 확인 ──
    if (pc && pc.length >= 3) {
      const pcLower = pc.toLowerCase();
      const hasSystem = PC_SYSTEM_KEYWORDS.some(kw => pcLower.includes(kw));
      if (!hasSystem) {
        warnings.push({
          ruleId: 'FMT_B5_SYSTEM',
          itemCode: 'B5',
          processNo: chain.processNo || '',
          value: pc,
          message: `B5(예방관리)에 구체적 장치명·시스템명·절차명이 누락 — 추상적 표현 지양`,
          level: 'warning',
        });
      }
    }

    // ── LEN_B5_SHORT: B5 최소 길이 ──
    if (pc && pc.length > 0 && pc.length < 5) {
      warnings.push({
        ruleId: 'LEN_B5_SHORT',
        itemCode: 'B5',
        processNo: chain.processNo || '',
        value: pc,
        message: `B5(예방관리) "${pc}" — 내용이 너무 짧음 (5자 이상 권장)`,
        level: 'warning',
      });
    }

    // ── FC_B4_MISMATCH: FC 고장원인이 B4 기준값에 없음 ── ★v13.3 (Error 레벨)
    const fcValue = (chain.fcValue || '').trim();
    if (fcValue && b4ValueSet.size > 0 && !b4ValueSet.has(fcValue)) {
      warnings.push({
        ruleId: 'FC_B4_MISMATCH',
        itemCode: 'FC',
        processNo: chain.processNo || '',
        value: fcValue,
        message: `FC 고장원인 "${fcValue.slice(0, 40)}" — B4 시트 기준값에 없음 (WE→FC 연결 실패 위험)`,
        level: 'error',
      });
    }

    // ── B4_VERB_ENDING (FC 컬럼): FC에도 동사형 종결 검사 ── ★v13.3
    if (fcValue && matchesAnyPattern(fcValue, B4_VERB_ENDING_PATTERNS)) {
      warnings.push({
        ruleId: 'B4_VERB_ENDING',
        itemCode: 'FC',
        processNo: chain.processNo || '',
        value: fcValue,
        message: `FC(고장원인)에 동사형 종결 — 명사형 3대 패턴 사용: [이탈형/인과형/누락형]`,
        level: 'error',
      });
    }
  }

  // ── MATCH_B1_WE: B1↔FC(WE) 표기 일치 ──
  const b1Values = new Map<string, Set<string>>();
  for (const item of flatData) {
    if (item.itemCode === 'B1' && item.value?.trim()) {
      const key = item.processNo;
      if (!b1Values.has(key)) b1Values.set(key, new Set());
      b1Values.get(key)!.add(item.value.trim());
    }
  }

  for (const chain of chains) {
    const we = (chain.workElement || '').trim();
    if (!we || !chain.processNo) continue;
    const b1Set = b1Values.get(chain.processNo);
    if (!b1Set) continue;
    const exactMatch = b1Set.has(we);
    if (!exactMatch) {
      const caseMatch = [...b1Set].find(b => b.toLowerCase() === we.toLowerCase());
      if (caseMatch) {
        warnings.push({
          ruleId: 'MATCH_B1_WE',
          itemCode: 'B1',
          processNo: chain.processNo,
          value: we,
          message: `B1 "${caseMatch}"과 FC WE "${we}" 대소문자/공백 불일치`,
          level: 'warning',
        });
      }
    }
  }

  return warnings;
}

/**
 * 검증 결과를 카테고리별로 요약
 */
export function summarizeAccuracyWarnings(warnings: AccuracyWarning[]): {
  total: number;
  byRule: Record<string, number>;
  byCode: Record<string, number>;
} {
  const byRule: Record<string, number> = {};
  const byCode: Record<string, number> = {};
  for (const w of warnings) {
    byRule[w.ruleId] = (byRule[w.ruleId] || 0) + 1;
    byCode[w.itemCode] = (byCode[w.itemCode] || 0) + 1;
  }
  return { total: warnings.length, byRule, byCode };
}
