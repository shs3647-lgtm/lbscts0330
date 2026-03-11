/**
 * @file b3-empty-m4-fallback.test.ts
 * @description B3(공정특성) 누락 방지 — 4M 빈 행 폴백 검증
 *
 * 문제: has4mColumn=true인데 특정 행의 fc4m이 비어있으면 rowM4='' → B1/B2/B3 gate 통과 실패
 * 해결: rowM4가 빈 문자열일 때 'MC'로 폴백하여 B1/B2/B3 생성 보장
 *
 * @created 2026-03-05
 */

import { describe, it, expect, vi } from 'vitest';

// industry-rules 사이드이펙트 import mock
vi.mock('../../app/(fmea-core)/pfmea/import/stepb-parser/industry-rules', () => ({}));

// pc-dc-inference mock (require 경로 문제 우회)
vi.mock('../../app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference', () => ({
  getDefaultRuleSet: () => ({
    id: 'test', name: '테스트',
    pcRulesFC: [], pcRulesFM: [], m4Defaults: {}, dcRules: [],
    fallbackPC: '작업 표준 준수 교육',
    fallbackDC: { dc: '육안 검사', d: 7 },
  }),
  inferPC: () => '작업 표준 준수',
  inferDC: () => ({ dc: '육안 검사', d: 7 }),
  inferChar: (_fc: string, _fm: string, _m4: string, we: string) =>
    we ? `${we} 관리 특성` : '공정 관리 특성',
  inferMissingPCDC: (rows: Array<Record<string, string>>) => rows,
  inferC2C3: () => ({ c2Items: [], c3Items: [] }),
  getIndustryRuleSet: () => null,
}));

import { buildImportData } from '../../app/(fmea-core)/pfmea/import/stepb-parser/import-builder';
import { WarningCollector } from '../../app/(fmea-core)/pfmea/import/stepb-parser/types';
import type { StepBRawRow } from '../../app/(fmea-core)/pfmea/import/stepb-parser/types';

/** StepBRawRow 전체 필드를 포함하는 기본 행 생성 */
function makeBaseRow(): StepBRawRow {
  return {
    excelRow: 1,
    procNo: '10',
    l1Name: 'Photo 공정',
    procName: '10번-Developer',
    l1_4m: '',
    l1We: '',
    l1Scope: '',
    l1Func: 'Photo 공정을 통해 패턴을 형성한다',
    l2Func: '조건에 맞는 Recipe를 생성 관리 한다',
    l2_4m: '',
    l2We: '',
    l2ElemFunc: '',
    feScope: '후속공정',
    fe: '현상 불량',
    s: '7',
    fm: 'Recipe 오류',
    fc4m: 'MC',
    fcWe: '',
    fc: '관리 미흡',
    pc: '작업 표준 준수',
    o: '4',
    dc: '육안 검사',
    d: '5',
    ap: 'M',
    sc: '',
    feNorm: '현상 불량',
    feScopeNorm: '후속공정',
    fmNorm: 'Recipe 오류',
    fcNorm: '관리 미흡',
    weNorm: '',
    sInt: 7,
    oInt: 4,
    dInt: 5,
    scNorm: '',
  };
}

/** 4M 컬럼이 있는 포맷에서 일부 행의 4M이 비어있는 케이스 */
function makeRowsWithEmpty4M(): StepBRawRow[] {
  const base = makeBaseRow();
  return [
    {
      ...base,
      excelRow: 1,
      fc4m: 'MC',
      weNorm: "Develop 공정 Eng'r",
      fcNorm: '조건 설정 오류',
      fmNorm: 'Recipe 오류',
    },
    // ★ 핵심: 4M 빈 문자열 → 이 행이 B1/B2/B3 누락됨
    {
      ...base,
      excelRow: 2,
      fc4m: '',
      weNorm: 'Developer 항온수 유지',
      fcNorm: '온도 관리 미흡',
      fmNorm: '온도 불량',
    },
    {
      ...base,
      excelRow: 3,
      fc4m: 'MC',
      weNorm: 'Descum 공정 작업자',
      fcNorm: '작업 미흡',
      fmNorm: '작업 오류',
    },
  ];
}

describe('B3 공정특성 — 4M 빈 행 폴백', () => {

  it('사전조건: has4mColumn=true (MC가 있는 행 존재)', () => {
    const rows = makeRowsWithEmpty4M();
    const has4m = rows.some(r => ['MC', 'MN', 'MT', 'ME'].includes(r.fc4m.trim().toUpperCase()));
    expect(has4m).toBe(true);
  });

  it('fc4m이 비어있어도 B1이 생성되어야 한다 (3건)', () => {
    const result = buildImportData(makeRowsWithEmpty4M(), new WarningCollector());
    // buildImportData 반환: b1 = Map<procNo, B1Item[]>
    const b1Items = result.b1.get('10') || [];
    expect(b1Items.length).toBe(3);
  });

  it('fc4m이 비어있어도 B3가 생성되어야 한다 (3건)', () => {
    const result = buildImportData(makeRowsWithEmpty4M(), new WarningCollector());
    const b3Items = result.b3.get('10') || [];
    expect(b3Items.length).toBe(3);
  });

  it('B3 값에 Developer 항온수 유지 관련 특성이 포함되어야 한다', () => {
    const result = buildImportData(makeRowsWithEmpty4M(), new WarningCollector());
    const b3Items = result.b3.get('10') || [];
    const b3Chars = b3Items.map(b => b.char);
    const hasDevHotWater = b3Chars.some(v => v.includes('항온수') || v.includes('Developer'));
    expect(hasDevHotWater).toBe(true);
  });

  it('모든 B1에 대응하는 B3가 있어야 한다 (B1 ≤ B3)', () => {
    const result = buildImportData(makeRowsWithEmpty4M(), new WarningCollector());
    const b1Count = (result.b1.get('10') || []).length;
    const b3Count = (result.b3.get('10') || []).length;
    expect(b3Count).toBeGreaterThanOrEqual(b1Count);
  });

});
