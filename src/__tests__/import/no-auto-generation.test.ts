/**
 * @file no-auto-generation.test.ts
 * @description Rule 1.5.2 위반 방지 — import-builder에서 자동생성 문자열이 포함되지 않는지 검증
 *
 * Rule 1.5.2: DB에 없는 데이터를 코드에서 자동생성하는 것은 절대 금지
 * Rule 0.9: DC/PC 추론은 추천 UI에서만 허용
 *
 * @created 2026-03-22
 */

import { describe, it, expect, vi } from 'vitest';
import type { StepBRawRow } from
  '@/app/(fmea-core)/pfmea/import/stepb-parser/types';
import { WarningCollector } from
  '@/app/(fmea-core)/pfmea/import/stepb-parser/types';

// pc-dc-inference 전체를 mock (require 런타임 호출 우회)
vi.mock('@/app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference', () => ({
  inferPC: (_fc: string, _m4: string, _rules: unknown, _fm?: string) => '',
  inferDC: (_fm: string, _rules: unknown) => ({ dc: '', d: 5 }),
  inferChar: (_fc: string, _fm: string, _m4: string, _we: string, _rules: unknown) => '',
  inferC2C3: (_c4: Array<{ scope: string; fe: string }>, _warn: WarningCollector) => ({ c2Map: new Map(), c3Map: new Map() }),
  getDefaultRuleSet: () => ({ pcRules: [], pcRulesFC: [], pcRulesFM: [], dcRules: [], charRules: [], charRulesFC: [], charRulesFM: [], c2Rules: [], id: 'mock', name: 'mock' }),
  enhancePCFormat: (s: string, _m4: string) => s,
  enhanceDCFormat: (s: string) => s,
  inferPCWithConfidence: (_fc: string, _m4: string, _rules: unknown, _fm?: string) => ({ value: '', confidence: 'none', requiresReview: false }),
  inferDCWithConfidence: (_fm: string, _rules: unknown) => ({ dc: '', d: 5, confidence: 'none', requiresReview: false }),
  registerIndustryRuleSet: (_ruleSet: unknown) => {},
}));

const FORBIDDEN_AUTO_GEN = [
  '부적합',
  '불량',
  '관리 특성',
  '공정 품질 특성',
  '충족',
  '방지 기능',
];

function makeRow(overrides: Partial<StepBRawRow> = {}): StepBRawRow {
  return {
    excelRow: 2,
    procNo: '10',
    l1Name: '',
    procName: 'Test Process',
    l1_4m: '',
    l1We: '',
    l1Scope: '',
    l1Func: '',
    l2Func: 'Test Function',
    l2_4m: '',
    l2We: '',
    l2ElemFunc: '',
    feScope: '',
    fe: '',
    s: '',
    fm: '',
    fc4m: 'MC',
    fcWe: '',
    fc: '',
    pc: '',
    o: '',
    dc: '',
    d: '',
    ap: '',
    sc: '',
    feNorm: '',
    feScopeNorm: '',
    fmNorm: '',
    fcNorm: '',
    weNorm: '',
    sInt: null,
    oInt: null,
    dInt: null,
    scNorm: '',
    ...overrides,
  };
}

const makeWarn = () => new WarningCollector();

describe('Rule 1.5.2: import-builder 자동생성 문자열 금지', () => {

  describe('A5 자동생성 금지', () => {
    it('A4가 있지만 A5가 없을 때 "부적합" 접미사로 A5를 자동생성하면 안 됨', async () => {
      const { buildImportData } = await import(
        '@/app/(fmea-core)/pfmea/import/stepb-parser/import-builder'
      );

      const row = makeRow({
        procNo: '10',
        procName: 'PR Coating',
        l2Func: 'PR Coating Function',
        fc4m: 'MC',
        fcWe: 'Coater',
        weNorm: 'Coater',
        fm: '',
        fe: '',
        fc: '',
        sc: 'CC',
      });

      const result = buildImportData([row], makeWarn(), undefined);

      const a5Items = [...(result.a5?.values() || [])].flat();
      for (const a5 of a5Items) {
        for (const pattern of FORBIDDEN_AUTO_GEN) {
          expect(a5, `A5="${a5}" contains forbidden auto-gen "${pattern}"`).not.toContain(pattern);
        }
      }
    });
  });

  describe('B3 자동생성 금지', () => {
    it('B4가 있지만 B3가 없을 때 FC에서 파생된 B3를 자동생성하면 안 됨', async () => {
      const { buildImportData } = await import(
        '@/app/(fmea-core)/pfmea/import/stepb-parser/import-builder'
      );

      const row = makeRow({
        procNo: '10',
        procName: 'PR Coating',
        l2Func: 'Coating Function',
        fc4m: 'MC',
        fcWe: 'Coater',
        weNorm: 'Coater',
        fm: '표면 불량',
        fmNorm: '표면 불량',
        fc: '온도 이탈',
        fcNorm: '온도 이탈',
        fe: '외관 불량',
        feNorm: '외관 불량',
      });

      const result = buildImportData([row], makeWarn(), undefined);

      const b3Items = [...(result.b3?.values() || [])].flat();
      for (const b3 of b3Items) {
        const charVal = typeof b3 === 'string' ? b3 : b3.char;
        for (const pattern of FORBIDDEN_AUTO_GEN) {
          expect(charVal, `B3="${charVal}" contains forbidden "${pattern}"`).not.toContain(pattern);
        }
      }
    });
  });

  describe('공통공정 01번 자동생성 금지', () => {
    it('공통공정 01번의 A5에 "부적합", B3에 "관리 특성"이 포함되면 안 됨', async () => {
      const { buildImportData } = await import(
        '@/app/(fmea-core)/pfmea/import/stepb-parser/import-builder'
      );

      const row = makeRow({
        procNo: '10',
        procName: 'PR Coating',
        l2Func: 'Coating',
        fc4m: 'MC',
        weNorm: 'Coater',
        fm: '표면 불량',
        fmNorm: '표면 불량',
        fc: '온도 이탈',
        fcNorm: '온도 이탈',
        fe: '외관 불량',
        feNorm: '외관 불량',
      });

      const result = buildImportData([row], makeWarn(), undefined);

      const a5_01 = result.a5.get('01') || result.a5.get('1') || [];
      for (const a5 of a5_01) {
        expect(a5, `공통공정 A5="${a5}"`).not.toContain('부적합');
      }

      const b3_01 = result.b3.get('01') || result.b3.get('1') || [];
      for (const b3 of b3_01) {
        expect(b3.char, `공통공정 B3="${b3.char}"`).not.toContain('관리 특성');
      }
    });
  });

  describe('A4 자동생성 금지', () => {
    it('A3가 있지만 A4가 없을 때 "공정 품질 특성" 자동생성하면 안 됨', async () => {
      const { buildImportData } = await import(
        '@/app/(fmea-core)/pfmea/import/stepb-parser/import-builder'
      );

      const row = makeRow({
        procNo: '10',
        procName: 'PR Coating',
        l2Func: 'Coating Function',
        fc4m: 'MC',
        weNorm: 'Coater',
        sc: '',
      });

      const result = buildImportData([row], makeWarn(), undefined);

      const a4Items = [...(result.a4?.values() || [])].flat();
      for (const a4 of a4Items) {
        const charVal = typeof a4 === 'string' ? a4 : a4.char;
        expect(charVal, `A4="${charVal}"`).not.toContain('공정 품질 특성');
      }
    });
  });
});
