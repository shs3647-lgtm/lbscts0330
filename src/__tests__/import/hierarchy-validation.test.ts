/**
 * @file hierarchy-validation.test.ts
 * @description PFMEA Import 상하관계 검증 TDD 테스트
 * @created 2026-02-17
 *
 * 검증 규칙:
 * - 상하관계: L2→L3 부모-자식 존재 확인
 * - 갯수: 최소 1:1 (상위 데이터마다 하위 데이터 1개 이상)
 * - 불일치 시 Import 차단 (ERROR)
 * - processNo=00 예외 없음 (동일 규칙 적용)
 */

import { describe, it, expect } from 'vitest';
import { validateHierarchy } from '@/app/(fmea-core)/pfmea/import/utils/hierarchy-validation';
import type { ParseResult, ProcessRelation, ProductRelation } from '@/app/(fmea-core)/pfmea/import/excel-parser';

// ─── 테스트 헬퍼 ───────────────────────────────────────────────

/** 정상 공정 데이터 생성 (모든 항목 1:1 이상) */
function makeProcess(overrides: Partial<ProcessRelation> = {}): ProcessRelation {
  return {
    processNo: '10',
    processName: '조립',
    processDesc: ['부품 조립'],          // A3
    productChars: ['외관'],              // A4
    productCharsSpecialChar: [],         // A4 특별특성
    failureModes: ['미조립'],            // A5
    failureModesSpecialChar: [],         // A5 특별특성
    workElements: ['나사'],              // B1
    workElements4M: ['MC'],              // B1 4M
    elementFuncs: ['체결'],              // B2
    elementFuncs4M: ['MC'],              // B2 4M
    elementFuncsWE: [],                  // B2 소속 WE
    processChars: ['토크'],              // B3
    processChars4M: ['MC'],              // B3 4M
    processCharsSpecialChar: [],         // B3 특별특성
    processCharsWE: [],                  // B3 소속 WE
    failureCauses: ['토크 부족'],        // B4
    failureCauses4M: ['MC'],             // B4 4M
    failureCausesSpecialChar: [],        // B4 특별특성
    failureCausesWE: [],                 // B4 소속 WE
    preventionCtrls: [],                 // B5
    preventionCtrls4M: [],               // B5 4M
    preventionCtrlsWE: [],               // B5 소속 WE
    detectionCtrls: [],                  // A6
    ...overrides,
  };
}

/** 정상 L1 완제품 데이터 */
function makeProduct(overrides: Partial<ProductRelation> = {}): ProductRelation {
  return {
    productProcessName: 'YP',            // C1
    productFuncs: ['안전 기능'],         // C2
    requirements: ['고객 요구'],         // C3
    failureEffects: ['안전 위험'],       // C4
    ...overrides,
  };
}

/** ParseResult 생성 */
function makeParseResult(
  processes: ProcessRelation[],
  products: ProductRelation[] = [makeProduct()],
): ParseResult {
  return {
    success: true,
    processes,
    products,
    failureChains: [],
    sheetSummary: [],
    errors: [],
  };
}

// ─── 구조+기능 필수 검증 ────────────────────────────────────────

describe('상하관계 검증 (Hierarchy Validation)', () => {

  describe('구조+기능 필수 검증', () => {

    it('1. 정상 데이터 → valid=true, errors=[]', () => {
      const result = makeParseResult([makeProcess()]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(true);
      expect(v.errors).toHaveLength(0);
    });

    it('2. B1 있는데 B2 없음 (60번 공정 IM 사고 재현) → ERROR [C3]', () => {
      const proc = makeProcess({
        processNo: '60',
        workElements: ['나사', '그리스'],
        workElements4M: ['MC', 'IM'],
        elementFuncs: ['체결'],           // MC만 있음
        elementFuncs4M: ['MC'],           // IM 누락!
        processChars: ['토크'],
        processChars4M: ['MC'],
        failureCauses: ['토크 부족'],
        failureCauses4M: ['MC'],
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      // IM에 대한 B2 누락 에러가 있어야 함
      const b2Error = v.errors.find(e => e.rule === 'C3' && e.m4 === 'IM');
      expect(b2Error).toBeDefined();
      expect(b2Error!.processNo).toBe('60');
      expect(b2Error!.parentCode).toBe('B1');
      expect(b2Error!.childCode).toBe('B2');
      expect(b2Error!.childCount).toBe(0);
    });

    it('3. B1 있는데 B3 없음 → ERROR [C4]', () => {
      const proc = makeProcess({
        processNo: '60',
        workElements: ['나사', '그리스'],
        workElements4M: ['MC', 'IM'],
        elementFuncs: ['체결', '도포'],
        elementFuncs4M: ['MC', 'IM'],
        processChars: ['토크'],           // MC만 있음
        processChars4M: ['MC'],           // IM 누락!
        failureCauses: ['토크 부족'],
        failureCauses4M: ['MC'],
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const b3Error = v.errors.find(e => e.rule === 'C4' && e.m4 === 'IM');
      expect(b3Error).toBeDefined();
      expect(b3Error!.childCode).toBe('B3');
    });

    it('4. A1 있는데 B1 없음 (L2→L3 없음) → ERROR [H1]', () => {
      const proc = makeProcess({
        workElements: [],
        workElements4M: [],
        elementFuncs: [],
        elementFuncs4M: [],
        elementFuncsWE: [],
        processChars: [],
        processChars4M: [],
        failureCauses: [],
        failureCauses4M: [],
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const h1Error = v.errors.find(e => e.rule === 'H1');
      expect(h1Error).toBeDefined();
      expect(h1Error!.processNo).toBe('10');
    });

    it('5. A1 있는데 A3 없음 (공정기능 없음) → ERROR [C2]', () => {
      const proc = makeProcess({
        processDesc: [],  // A3 없음
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const c2Error = v.errors.find(e => e.rule === 'C2');
      expect(c2Error).toBeDefined();
      expect(c2Error!.parentCode).toBe('A1');
      expect(c2Error!.childCode).toBe('A3');
    });
  });

  // ─── 공통공정(00) 동일 규칙 ──────────────────────────────────

  describe('공통공정(00) 동일 규칙', () => {

    it('6. processNo=00에 B1 있는데 B2 없음 → ERROR (예외 없음) [H2]', () => {
      const common = makeProcess({
        processNo: '00',
        processName: '공통',
        workElements: ['작업환경'],
        workElements4M: ['EN'],
        elementFuncs: [],             // B2 없음!
        elementFuncs4M: [],
        elementFuncsWE: [],
        processChars: [],
        processChars4M: [],
        failureCauses: [],
        failureCauses4M: [],
      });
      const normal = makeProcess({ processNo: '10' });
      const result = makeParseResult([common, normal]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const err = v.errors.find(e => e.processNo === '00' && e.rule === 'C3');
      expect(err).toBeDefined();
    });

    it('7. processNo=00에 A1 있는데 B1 없음 → ERROR (예외 없음) [H1]', () => {
      const common = makeProcess({
        processNo: '00',
        processName: '공통',
        workElements: [],             // B1 없음!
        workElements4M: [],
        elementFuncs: [],
        elementFuncs4M: [],
        elementFuncsWE: [],
        processChars: [],
        processChars4M: [],
        failureCauses: [],
        failureCauses4M: [],
      });
      const normal = makeProcess({ processNo: '10' });
      const result = makeParseResult([common, normal]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const err = v.errors.find(e => e.processNo === '00' && e.rule === 'H1');
      expect(err).toBeDefined();
    });
  });

  // ─── L1 검증 ─────────────────────────────────────────────────

  describe('L1 검증', () => {

    it('8. C1 있는데 C2 없음 → ERROR [H5/C6]', () => {
      const product = makeProduct({
        productFuncs: [],  // C2 없음
      });
      const result = makeParseResult([makeProcess()], [product]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const err = v.errors.find(e => e.rule === 'C6');
      expect(err).toBeDefined();
      expect(err!.parentCode).toBe('C1');
      expect(err!.childCode).toBe('C2');
    });
  });

  // ─── 고장분석 검증 ───────────────────────────────────────────

  describe('고장분석 검증', () => {

    it('9. A5(고장형태) 없음 → ERROR (필수) [H6/C7]', () => {
      const proc = makeProcess({
        failureModes: [],  // A5 없음
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const err = v.errors.find(e => e.rule === 'C7');
      expect(err).toBeDefined();
      expect(err!.childCode).toBe('A5');
    });

    it('10. A5가 일부 공정만 있음 → ERROR [C7]', () => {
      const proc1 = makeProcess({ processNo: '10' });
      const proc2 = makeProcess({
        processNo: '20',
        processName: '검사',
        failureModes: [],  // 20번 공정에 A5 없음
      });
      const result = makeParseResult([proc1, proc2]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const err = v.errors.find(e => e.rule === 'C7' && e.processNo === '20');
      expect(err).toBeDefined();
    });

    it('11. B4(고장원인) 전체 0건 → valid=true (조건부 스킵)', () => {
      const proc = makeProcess({
        failureCauses: [],     // B4 전체 없음
        failureCauses4M: [],
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      // B4가 전체 0건이면 조건부 스킵 → ERROR 아님
      const b4Errors = v.errors.filter(e => e.childCode === 'B4');
      expect(b4Errors).toHaveLength(0);
    });

    it('12. B4가 일부 공정만 있음(1건↑) → ERROR [C5]', () => {
      const proc1 = makeProcess({ processNo: '10' }); // B4 있음
      const proc2 = makeProcess({
        processNo: '20',
        processName: '검사',
        workElements: ['측정기'],
        workElements4M: ['MC'],
        elementFuncs: ['측정'],
        elementFuncs4M: ['MC'],
        processChars: ['정밀도'],
        processChars4M: ['MC'],
        failureCauses: [],           // 20번에 B4 없음
        failureCauses4M: [],
        failureModes: ['측정불량'],
      });
      const result = makeParseResult([proc1, proc2]);
      const v = validateHierarchy(result);

      expect(v.valid).toBe(false);
      const err = v.errors.find(e => e.rule === 'C5' && e.processNo === '20');
      expect(err).toBeDefined();
      expect(err!.childCode).toBe('B4');
    });
  });

  // ─── 보조 검증 ───────────────────────────────────────────────

  describe('보조 검증', () => {

    it('13. B2 있는데 B1 없음 (orphan) → WARNING [O1]', () => {
      const proc = makeProcess({
        workElements: ['나사'],
        workElements4M: ['MC'],
        elementFuncs: ['체결', '도포'],      // MC + IM
        elementFuncs4M: ['MC', 'IM'],        // IM은 B1에 없음 → orphan
        processChars: ['토크'],
        processChars4M: ['MC'],
        failureCauses: ['토크 부족'],
        failureCauses4M: ['MC'],
      });
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      // orphan은 WARNING이므로 valid에 영향 없음
      const orphan = v.warnings.find(e => e.rule === 'O1' && e.m4 === 'IM');
      expect(orphan).toBeDefined();
    });

    it('14. A6/B5 필드 미포함 → valid=true (리스크분석 제외)', () => {
      // A6/B5는 ProcessRelation에서 제거됨 (v3.0) — 고장사슬(failureChains)에서 관리
      const proc = makeProcess();
      const result = makeParseResult([proc]);
      const v = validateHierarchy(result);

      // A6/B5는 리스크분석 단계 → 검증 제외
      expect(v.valid).toBe(true);
      expect(v.errors).toHaveLength(0);
    });
  });

  // ─── summary 검증 ────────────────────────────────────────────

  describe('summary 통계', () => {

    it('summary에 L1/L2/L3 갯수 반환', () => {
      const procs = [
        makeProcess({ processNo: '10', workElements: ['a'], workElements4M: ['MC'] }),
        makeProcess({ processNo: '20', processName: '검사', workElements: ['b', 'c'], workElements4M: ['MC', 'EN'], elementFuncs: ['f1', 'f2'], elementFuncs4M: ['MC', 'EN'], processChars: ['p1', 'p2'], processChars4M: ['MC', 'EN'], failureCauses: ['c1', 'c2'], failureCauses4M: ['MC', 'EN'], failureModes: ['fm1'] }),
      ];
      const products = [makeProduct(), makeProduct({ productProcessName: 'SP', productFuncs: ['기능2'], requirements: ['요구2'], failureEffects: ['영향2'] })];
      const result = makeParseResult(procs, products);
      const v = validateHierarchy(result);

      expect(v.summary.l1Count).toBe(2);  // YP, SP
      expect(v.summary.l2Count).toBe(2);  // 공정 10, 20
      expect(v.summary.l3Count).toBe(3);  // 10::MC, 20::MC, 20::EN
    });
  });
});
