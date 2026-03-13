/**
 * @file accuracy-validation.ts
 * @description PFMEA 기초정보 작성정확도 검증 (지침서 v2.0 기반)
 * 항목 간 혼입 검출, 형식 검증, B5↔A6 교차 검증
 * @created 2026-03-13
 *
 * 검증 규칙:
 *   MIX_A4_B3   — A4(제품특성)에 공정 파라미터(B3) 키워드 혼입
 *   MIX_A5_CAUSE — A5(고장형태)에 고장원인(B4) 키워드 혼입
 *   MIX_B4_SYMPTOM — B4(고장원인)에 고장형태(A5) 키워드 혼입
 *   VERB_A4_A5  — A4/A5에 동사형 표현 사용
 *   MIX_B5_A6   — B5(예방)↔A6(검출) 교차 혼입
 *   MATCH_B1_WE — B1↔FC(WE) 표기 불일치
 *
 * 모든 규칙은 warning 레벨 — 차단하지 않고 경고만 표시
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';

export interface AccuracyWarning {
  ruleId: string;
  itemCode: string;
  processNo: string;
  value: string;
  message: string;
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
  '규격 이탈', '미달', '초과', '미형성', '부재', '잔류',
  'scratch', '파손', '크랙', 'chipping', 'crack',
  'spec out', 'under-spec', 'over-spec', 'missing',
  '불만족', '미검출', '유출',
];

// ── A4/A5에서 금지되는 동사형 표현 ──
const VERB_PATTERNS = [
  /check$/i, /inspection$/i, /진행$/,
  /확인하다$/, /검사하다$/, /한다$/, /한다\.?$/,
  /측정$/, /모니터링$/,
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
        });
      }
    }

    // ── MIX_B4_SYMPTOM: B4에 이탈 현상 키워드 혼입 ──
    if (item.itemCode === 'B4') {
      const hit = containsAny(val, A5_KEYWORDS);
      if (hit) {
        warnings.push({
          ruleId: 'MIX_B4_SYMPTOM',
          itemCode: 'B4',
          processNo: item.processNo,
          value: val,
          message: `B4(고장원인)에 고장형태(A5) 키워드 "${hit}" 혼입 의심`,
        });
      }
    }

    // ── VERB_A4_A5: A4/A5에 동사형 표현 ──
    if ((item.itemCode === 'A4' || item.itemCode === 'A5') && matchesAnyPattern(val, VERB_PATTERNS)) {
      warnings.push({
        ruleId: 'VERB_A4_A5',
        itemCode: item.itemCode,
        processNo: item.processNo,
        value: val,
        message: `${item.itemCode}는 명사형으로 작성해야 합니다 (동사형 표현 감지)`,
      });
    }
  }

  return warnings;
}

/**
 * FC 고장사슬 기반 B5↔A6 교차 검증 + B1↔WE 표기 일치
 */
export function validateFCAccuracy(
  flatData: ImportedFlatData[],
  chains: MasterFailureChain[],
): AccuracyWarning[] {
  const warnings: AccuracyWarning[] = [];

  for (const chain of chains) {
    // ── MIX_B5_A6: B5에 검출 키워드 ──
    const pc = (chain.pcValue || '').trim();
    if (pc) {
      const hit = containsAny(pc, DETECTION_IN_B5);
      if (hit) {
        warnings.push({
          ruleId: 'MIX_B5_A6',
          itemCode: 'B5',
          processNo: chain.processNo || '',
          value: pc,
          message: `B5(예방관리)에 검출 키워드 "${hit}" 혼입 → A6으로 이동 검토`,
        });
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
        });
      }
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
