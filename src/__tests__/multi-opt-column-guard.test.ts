/**
 * @file multi-opt-column-guard.test.ts
 * @description ALL탭 다중행 개선안 컬럼 분류 보호 테스트
 *
 * INVARIANT: step='최적화' 컬럼은 반드시 OPT_COL_CLASSIFICATION에서
 * 'multi' 또는 'aggregated'로 분류되어야 함.
 * 미분류 컬럼 → optIdx>0 행에서 추가 <td> 생성 → 테이블 레이아웃 파괴.
 *
 * @created 2026-03-01
 * @updated 2026-03-01 — S/O/D/AP/RPN → 'multi' 전환 (독립행 재평가)
 */

import { describe, it, expect } from 'vitest';
import { COLUMNS_BASE, getColumnsWithRPN } from
  '@/app/(fmea-core)/pfmea/worksheet/tabs/all/allTabConstants';
import {
  OPT_COL_CLASSIFICATION,
  MULTI_ROW_COL_NAMES,
  AGGREGATED_OPT_COL_NAMES,
  getOptSODKey,
  getOptRowKey,
  addOptRow,
  removeOptRow,
} from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/multiOptUtils';
import { RE_EVAL_MAP } from
  '@/app/(fmea-core)/pfmea/worksheet/tabs/all/riskOptTypes';

// 모든 step-6 컬럼명 수집 (base + RPN 확장)
const step6Base = COLUMNS_BASE.filter(c => c.step === '최적화').map(c => c.name);
const step6WithRPN = getColumnsWithRPN().filter(c => c.step === '최적화').map(c => c.name);
const allStep6Names = [...new Set([...step6Base, ...step6WithRPN])];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 컬럼 분류 완전성 (Exhaustiveness)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Multi-Opt Column Classification Guard', () => {
  it('COLUMNS_BASE에 최적화 컬럼이 13개 이상이어야 함', () => {
    expect(step6Base.length).toBeGreaterThanOrEqual(13);
  });

  it('모든 최적화 컬럼이 OPT_COL_CLASSIFICATION에 분류되어야 함', () => {
    const unclassified = allStep6Names.filter(name => !(name in OPT_COL_CLASSIFICATION));
    expect(unclassified).toEqual([]);
  });

  it('OPT_COL_CLASSIFICATION에 실제 컬럼에 없는 항목이 없어야 함 (역방향)', () => {
    const classifiedNames = Object.keys(OPT_COL_CLASSIFICATION);
    const extraNames = classifiedNames.filter(name => !allStep6Names.includes(name));
    expect(extraNames).toEqual([]);
  });

  it('MULTI_ROW와 AGGREGATED에 교집합이 없어야 함', () => {
    const intersection = [...MULTI_ROW_COL_NAMES].filter(n => AGGREGATED_OPT_COL_NAMES.has(n));
    expect(intersection).toEqual([]);
  });

  it('MULTI_ROW + AGGREGATED = 전체 최적화 컬럼', () => {
    const combined = new Set([...MULTI_ROW_COL_NAMES, ...AGGREGATED_OPT_COL_NAMES]);
    for (const name of allStep6Names) {
      expect(combined.has(name)).toBe(true);
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 고정값 회귀 방지 (Regression Guard)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Multi-Opt Column Membership (regression)', () => {
  it('MULTI_ROW = 13개 (S/O/D/AP/RPN 독립행 포함)', () => {
    expect(MULTI_ROW_COL_NAMES.size).toBe(13);
  });

  it.each([
    '예방관리개선', '검출관리개선', '책임자성명', '목표완료일자',
    '상태', '개선결과근거', '완료일자', '비고',
    '심각도(S)', '발생도(O)', '검출도(D)', 'AP', 'RPN',
  ])('MULTI_ROW에 "%s" 포함', (name) => {
    expect(MULTI_ROW_COL_NAMES.has(name)).toBe(true);
  });

  it('AGGREGATED = 1개 (특별특성만)', () => {
    expect(AGGREGATED_OPT_COL_NAMES.size).toBe(1);
  });

  it.each([
    '특별특성(SC)',
  ])('AGGREGATED에 "%s" 포함', (name) => {
    expect(AGGREGATED_OPT_COL_NAMES.has(name)).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 컬럼명 정확성 (Name Match Guard)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Column Name Exact Match Guard', () => {
  it('AGGREGATED에 "(재평가)" 접미사가 있으면 안 됨', () => {
    for (const name of AGGREGATED_OPT_COL_NAMES) {
      expect(name).not.toContain('(재평가)');
    }
  });

  it('RE_EVAL_MAP 키가 실제 최적화 컬럼명과 일치해야 함', () => {
    const step6NameSet = new Set(allStep6Names);
    for (const key of Object.keys(RE_EVAL_MAP)) {
      expect(step6NameSet.has(key)).toBe(true);
    }
  });

  it('OPT_COL_CLASSIFICATION 키에 "(재평가)" 접미사가 없어야 함', () => {
    for (const key of Object.keys(OPT_COL_CLASSIFICATION)) {
      expect(key).not.toContain('(재평가)');
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. per-row SOD 키 생성 (getOptSODKey)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getOptSODKey — per-row SOD key generation', () => {
  it('Row 0: 하위호환 키', () => {
    expect(getOptSODKey('fm1-fc1', 'S', 0)).toBe('opt-fm1-fc1-S');
    expect(getOptSODKey('fm1-fc1', 'O', 0)).toBe('opt-fm1-fc1-O');
    expect(getOptSODKey('fm1-fc1', 'D', 0)).toBe('opt-fm1-fc1-D');
  });

  it('Row N: #N suffix 키', () => {
    expect(getOptSODKey('fm1-fc1', 'S', 1)).toBe('opt-fm1-fc1#1-S');
    expect(getOptSODKey('fm1-fc1', 'O', 2)).toBe('opt-fm1-fc1#2-O');
    expect(getOptSODKey('fm1-fc1', 'D', 3)).toBe('opt-fm1-fc1#3-D');
  });

  it('modalFcId 인코딩과 getOptSODKey 결과 일치', () => {
    // RiskOptCellRenderer: modalFcId = optIdx > 0 ? `${fcId}#${optIdx}` : fcId
    // useAllTabModals: riskKey = `opt-${fmId}-${modalFcId}-${category}`
    const fmId = 'fm1';
    const fcId = 'fc1';
    for (const optIdx of [0, 1, 2, 3]) {
      const modalFcId = optIdx > 0 ? `${fcId}#${optIdx}` : fcId;
      const modalKey = `opt-${fmId}-${modalFcId}-O`;
      const helperKey = getOptSODKey(`${fmId}-${fcId}`, 'O', optIdx);
      expect(modalKey).toBe(helperKey);
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. addOptRow 기본값 (person 승계, status, SOD 복사)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('addOptRow — default values', () => {
  it('상태 기본값 = open (대기)', () => {
    const riskData: Record<string, unknown> = { 'opt-rows-fm1-fc1': 1 };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['status-opt-fm1-fc1#1']).toBe('open');
  });

  it('담당자 이전 행 승계 (Row 0 → Row 1)', () => {
    const riskData: Record<string, unknown> = {
      'opt-rows-fm1-fc1': 1,
      'person-opt-fm1-fc1': '강태준',
    };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['person-opt-fm1-fc1#1']).toBe('강태준');
  });

  it('담당자 이전 행 승계 (Row 1 → Row 2)', () => {
    const riskData: Record<string, unknown> = {
      'opt-rows-fm1-fc1': 2,
      'person-opt-fm1-fc1': '홍길동',
      'person-opt-fm1-fc1#1': '강태준',
    };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['person-opt-fm1-fc1#2']).toBe('강태준');
  });

  it('담당자 비어있으면 승계하지 않음', () => {
    const riskData: Record<string, unknown> = { 'opt-rows-fm1-fc1': 1 };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['person-opt-fm1-fc1#1']).toBeUndefined();
  });

  it('SOD 이전 행 값 복사', () => {
    const riskData: Record<string, unknown> = {
      'opt-rows-fm1-fc1': 1,
      'opt-fm1-fc1-S': 8,
      'opt-fm1-fc1-O': 4,
      'opt-fm1-fc1-D': 5,
    };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['opt-fm1-fc1#1-S']).toBe(8);
    expect(updates['opt-fm1-fc1#1-O']).toBe(4);
    expect(updates['opt-fm1-fc1#1-D']).toBe(5);
  });

  it('SOD 비어있으면 복사하지 않음', () => {
    const riskData: Record<string, unknown> = { 'opt-rows-fm1-fc1': 1 };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['opt-fm1-fc1#1-S']).toBeUndefined();
    expect(updates['opt-fm1-fc1#1-O']).toBeUndefined();
    expect(updates['opt-fm1-fc1#1-D']).toBeUndefined();
  });

  it('opt-rows 카운트 증가', () => {
    const riskData: Record<string, unknown> = { 'opt-rows-fm1-fc1': 2 };
    const updates = addOptRow(riskData, 'fm1-fc1');
    expect(updates['opt-rows-fm1-fc1']).toBe(3);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. removeOptRow SOD 키 정리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('removeOptRow — SOD key cleanup', () => {
  it('삭제 행의 SOD 키 제거', () => {
    const riskData: Record<string, unknown> = {
      'opt-rows-fm1-fc1': 2,
      'prevention-opt-fm1-fc1': 'prev0',
      'prevention-opt-fm1-fc1#1': 'prev1',
      'opt-fm1-fc1-S': 8,
      'opt-fm1-fc1-O': 4,
      'opt-fm1-fc1-D': 5,
      'opt-fm1-fc1#1-S': 7,
      'opt-fm1-fc1#1-O': 3,
      'opt-fm1-fc1#1-D': 4,
    };
    const updates = removeOptRow(riskData, 'fm1-fc1', 1);
    // Row 1 SOD 키 제거됨
    expect(updates['opt-fm1-fc1#1-S']).toBe('');
    expect(updates['opt-fm1-fc1#1-O']).toBe('');
    expect(updates['opt-fm1-fc1#1-D']).toBe('');
  });

  it('중간 행 삭제 시 후속 행 SOD 번호 재조정', () => {
    const riskData: Record<string, unknown> = {
      'opt-rows-fm1-fc1': 3,
      'opt-fm1-fc1-S': 8,
      'opt-fm1-fc1#1-S': 7,
      'opt-fm1-fc1#1-O': 3,
      'opt-fm1-fc1#1-D': 4,
      'opt-fm1-fc1#2-S': 6,
      'opt-fm1-fc1#2-O': 2,
      'opt-fm1-fc1#2-D': 3,
    };
    const updates = removeOptRow(riskData, 'fm1-fc1', 1);
    // Row 2 → Row 1으로 shift
    expect(updates['opt-fm1-fc1#1-S']).toBe(6);
    expect(updates['opt-fm1-fc1#1-O']).toBe(2);
    expect(updates['opt-fm1-fc1#1-D']).toBe(3);
    // Row 2 제거
    expect(updates['opt-fm1-fc1#2-S']).toBe('');
    expect(updates['opt-fm1-fc1#2-O']).toBe('');
    expect(updates['opt-fm1-fc1#2-D']).toBe('');
  });
});
