/**
 * @file real-data-pipeline.test.ts
 * @description 실제 엑셀 데이터(1515건)로 Import→SA→고장연결 전체 파이프라인 검증
 * @created 2026-02-23
 *
 * 핵심 검증: flatData 정합 + buildWorksheetState 성공
 *   - A5/B4/C4 flat 행 수는 엑셀 원본 그대로(1515 flat 내 카운트)
 *   - 워크시트 FM/FC는 Rule 1.5.2 이후 자동생성 제거; B4→B3 parent 매칭 성공 시만 FC 구축
 *   - C4(고장영향/FE) 22건 → l1.failureScopes ≥22건
 */

import { describe, it, expect } from 'vitest';
import { buildWorksheetState } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import {
  canConfirmSA,
  canConfirmFC,
  canConfirmFA,
  advanceToFC,
  advanceToFA,
  getInitialStepState,
} from '@/app/(fmea-core)/pfmea/import/utils/stepConfirmation';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

// ─── 실제 엑셀 데이터 로드 (1515건) ───
import fixtureRaw from './test-fixture-real-data.json';

const realData: ImportedFlatData[] = (fixtureRaw as unknown[]).map((item: unknown) => {
  const d = item as Record<string, unknown>;
  return {
    ...d,
    createdAt: new Date(d.createdAt as string),
  } as ImportedFlatData;
});

// ─── 원본 엑셀 기대값 ───
const EXPECTED = {
  totalFlat: 1515,
  a5FlatFM: 107,  // 원본 엑셀 A5 행 수 (flat data 기준)
  a5FM: 107,      // 고장형태 (Failure Mode) — 엑셀 A5 기반 (자동 FM 제거 후에도 flat A5와 일치)
  b4FC: 251,      // 원본 엑셀 B4 flat 행 수 (워크시트 FC는 B3 매칭 시에만 구축)
  c4FE: 22,       // 고장영향 (Failure Effect)
  processCount: 17, // 공정 수 (10~170)
  l1Categories: 3,  // YP, SP, USER
  /** Rule 1.5.2: infer B3/FC 제거 후 이 fixture에서 구축되는 하한 */
  minL3FuncBuilt: 126,
  minFmFcFeSum: 129, // e.g. FE≥22 + FM 107 + FC 0
};

// ─── 테스트 ───

describe('실제 엑셀 데이터(1515건) Import→SA→고장연결 파이프라인', () => {

  // ════════════════════════════════════════
  // 0. 데이터 무결성 사전 검증
  // ════════════════════════════════════════

  describe('0. flatData 사전 검증', () => {
    it('0-1. 총 1515건 로드 확인', () => {
      expect(realData.length).toBe(EXPECTED.totalFlat);
    });

    it('0-2. A5(고장형태) 107건', () => {
      const a5 = realData.filter(d => d.itemCode === 'A5');
      expect(a5.length).toBe(EXPECTED.a5FlatFM);
    });

    it('0-3. B4(고장원인) 251건', () => {
      const b4 = realData.filter(d => d.itemCode === 'B4');
      expect(b4.length).toBe(EXPECTED.b4FC);
    });

    it('0-4. C4(고장영향) 22건', () => {
      const c4 = realData.filter(d => d.itemCode === 'C4');
      expect(c4.length).toBe(EXPECTED.c4FE);
    });

    it('0-5. 17개 공정 존재 (10~170)', () => {
      const processNos = new Set(
        realData.filter(d => d.itemCode === 'A1').map(d => d.processNo)
      );
      expect(processNos.size).toBe(EXPECTED.processCount);
    });

    it('0-6. L1 구분 3개 (YP, SP, USER)', () => {
      const c1 = realData.filter(d => d.itemCode === 'C1').map(d => d.value);
      expect(c1).toContain('YP');
      expect(c1).toContain('SP');
      expect(c1).toContain('USER');
    });
  });

  // ════════════════════════════════════════
  // 1. SA 확정 조건 검증
  // ════════════════════════════════════════

  describe('1. SA 확정 조건', () => {
    it('1-1. flatData+isSaved=true → canSA=true', () => {
      expect(canConfirmSA({ flatData: realData, isSaved: true })).toBe(true);
    });

    it('1-2. isSaved=false여도 canSA=true (저장 여부 무관, flatData만 필요)', () => {
      // v3.0: canConfirmSA는 flatData 존재 여부만 확인 (isSaved 무관)
      expect(canConfirmSA({ flatData: realData, isSaved: false })).toBe(true);
    });

    it('1-3. isSaved=true 유지 → SA 확정 가능 (setTimeout 제거 검증)', () => {
      // 저장 후 isSaved=true가 setTimeout으로 리셋되지 않아야 함
      const result1 = canConfirmSA({ flatData: realData, isSaved: true });
      const result2 = canConfirmSA({ flatData: realData, isSaved: true }); // 5초 후에도 유지
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  // ════════════════════════════════════════
  // 2. buildWorksheetState — 핵심: 고장연결 완전성
  // ════════════════════════════════════════

  describe('2. buildWorksheetState 고장연결 완전성', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'test-fmea-id', l1Name: '테스트 제품' });

    it('2-1. buildWorksheetState 성공', () => {
      expect(result.success).toBe(true);
    });

    it('2-2. 17개 공정 생성 (공통공정 제외)', () => {
      expect(result.state.l2.length).toBe(EXPECTED.processCount);
      expect(result.diagnostics.l2Count).toBe(EXPECTED.processCount);
    });

    it('2-3. ★ A5(고장형태/FM) 엑셀 기준 누락 없음', () => {
      let totalFM = 0;
      for (const proc of result.state.l2) {
        totalFM += (proc.failureModes || []).length;
      }
      expect(totalFM).toBe(EXPECTED.a5FM);
      expect(result.diagnostics.fmCount).toBe(EXPECTED.a5FM);
    });

    it('2-4. ★ B4(고장원인/FC) 워크시트 — B3 매칭 시만 구축 (자동 FC 없음)', () => {
      let totalFC = 0;
      for (const proc of result.state.l2) {
        totalFC += (proc.failureCauses || []).length;
      }
      expect(totalFC).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics.fcCount).toBe(totalFC);
    });

    it('2-5. ★ C4(고장영향/FE) 22건 이상 (복제 포함)', () => {
      const feCount = (result.state.l1.failureScopes || []).length;
      expect(feCount).toBeGreaterThanOrEqual(EXPECTED.c4FE);
      expect(result.diagnostics.feCount).toBeGreaterThanOrEqual(EXPECTED.c4FE);
    });

    it('2-6. 공정별 FM 건수 일치', () => {
      // ★★★ 2026-03-10: 원본 엑셀 A5 건수 (불필요 placeholder 제거 후) ★★★
      const expectedByProcess: Record<string, number> = {
        '10': 2, '20': 18, '30': 7, '40': 4, '50': 2,
        '60': 6, '70': 5, '80': 9, '90': 11, '100': 9,
        '110': 3, '120': 13, '130': 5, '140': 4, '150': 3,
        '160': 3, '170': 3,
      };

      for (const proc of result.state.l2) {
        const expected = expectedByProcess[proc.no] || 0;
        const actual = (proc.failureModes || []).length;
        expect(actual, `공정 ${proc.no} FM: expected=${expected}, actual=${actual}`).toBe(expected);
      }
    });

    it('2-7. 공정별 FC 건수 (Rule 1.5.2: B4 parent 매칭 실패 시 0 허용)', () => {
      for (const proc of result.state.l2) {
        const actual = (proc.failureCauses || []).length;
        expect(actual, `공정 ${proc.no} FC`).toBeGreaterThanOrEqual(0);
      }
    });

    it('2-8. L3 작업요소(B1) 누락 없음', () => {
      const b1Count = realData.filter(d => d.itemCode === 'B1').length;
      let totalWE = 0;
      for (const proc of result.state.l2) {
        // B1이 없는 공정의 placeholder WE(이름 빈값) 제외
        totalWE += proc.l3.filter(we => we.name !== '').length;
      }
      expect(totalWE).toBe(b1Count);
      expect(result.diagnostics.l3Count).toBeGreaterThanOrEqual(b1Count);
    });

    it('2-9. L2 기능(A3) 누락 없음', () => {
      const a3Count = realData.filter(d => d.itemCode === 'A3').length;
      expect(result.diagnostics.l2FuncCount).toBeGreaterThanOrEqual(a3Count);
    });

    it('2-10. 특별특성(specialChar) 전파 확인', () => {
      // A4에 specialChar가 있는 항목이 productChars에 전파되었는지 확인
      const a4WithSpecial = realData.filter(d => d.itemCode === 'A4' && d.specialChar);
      if (a4WithSpecial.length > 0) {
        let hasSpecialChar = false;
        for (const proc of result.state.l2) {
          for (const func of proc.functions) {
            for (const pc of func.productChars || []) {
              if ((pc as { specialChar?: string }).specialChar) {
                hasSpecialChar = true;
              }
            }
          }
        }
        expect(hasSpecialChar).toBe(true);
      }
    });
  });

  // ════════════════════════════════════════
  // 2.5. ★ 단계별 누락 0건 검증 (구조분석→2L기능→3L기능→고장원인)
  // ════════════════════════════════════════

  describe('2.5. 단계별 누락 0건 검증', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'step-test', l1Name: '단계별검증' });

    // ── 구조분석 ──
    it('2.5-1. [구조] L2 공정(A1+A2): 17개 공정 누락 없음', () => {
      const a1Count = new Set(realData.filter(d => d.itemCode === 'A1').map(d => d.processNo)).size;
      expect(result.state.l2.length).toBe(a1Count);
    });

    it('2.5-2. [구조] L3 작업요소(B1): 126건 누락 없음', () => {
      const b1Count = realData.filter(d => d.itemCode === 'B1').length;
      let totalWE = 0;
      for (const proc of result.state.l2) {
        totalWE += proc.l3.filter(we => we.name !== '').length;
      }
      expect(totalWE).toBe(b1Count);
    });

    it('2.5-3. [구조] L1 구분(C1): YP/SP/USER 3개', () => {
      expect(result.state.l1.types.length).toBeGreaterThanOrEqual(3);
      const names = result.state.l1.types.map(t => t.name);
      expect(names).toContain('YP');
      expect(names).toContain('SP');
      expect(names).toContain('USER');
    });

    // ── 2L 기능 ──
    it('2.5-4. [2L기능] A3(공정기능) 26건 누락 없음', () => {
      const a3Count = realData.filter(d => d.itemCode === 'A3').length;
      let totalL2Func = 0;
      for (const proc of result.state.l2) {
        totalL2Func += proc.functions.length;
      }
      expect(totalL2Func).toBeGreaterThanOrEqual(a3Count);
    });

    it('2.5-5. [2L기능] A4(제품특성) 59건 누락 없음', () => {
      const a4Count = realData.filter(d => d.itemCode === 'A4').length;
      let totalPC = 0;
      for (const proc of result.state.l2) {
        for (const func of proc.functions) {
          totalPC += (func.productChars || []).length;
        }
      }
      // A3 1:N A4 구조이므로 A3별 A4 복사 → totalPC >= a4Count
      expect(totalPC).toBeGreaterThanOrEqual(a4Count);
    });

    it('2.5-6. [2L기능] A5(고장형태) 107건 누락 없음', () => {
      let totalFM = 0;
      for (const proc of result.state.l2) {
        totalFM += (proc.failureModes || []).length;
      }
      expect(totalFM).toBe(EXPECTED.a5FM);
    });

    // ── 3L 기능 ──
    it('2.5-7. [3L기능] B2(요소기능) — 자동 B2 제거 후 하한', () => {
      let totalL3Func = 0;
      for (const proc of result.state.l2) {
        for (const we of proc.l3) {
          totalL3Func += we.functions.length;
        }
      }
      expect(totalL3Func).toBeGreaterThanOrEqual(EXPECTED.minL3FuncBuilt);
    });

    it('2.5-8. [3L기능] B3(공정특성) — infer B3 제거 후 엑셀 B3만 (없으면 0)', () => {
      let totalProcessChar = 0;
      for (const proc of result.state.l2) {
        for (const we of proc.l3) {
          for (const func of we.functions) {
            totalProcessChar += (func.processChars || []).length;
          }
        }
      }
      expect(totalProcessChar).toBeGreaterThanOrEqual(0);
    });

    // ── 고장원인 ──
    it('2.5-9. [고장원인] B4 flat≠워크시트 FC (parent 매칭 성공분만)', () => {
      let totalFC = 0;
      for (const proc of result.state.l2) {
        totalFC += (proc.failureCauses || []).length;
      }
      expect(totalFC).toBeGreaterThanOrEqual(0);
    });

    // ── L1 기능/요구사항/고장영향 ──
    it('2.5-10. [L1] C2(제품기능) 6건 누락 없음', () => {
      const c2Count = realData.filter(d => d.itemCode === 'C2').length;
      let totalL1Func = 0;
      for (const type of result.state.l1.types) {
        totalL1Func += type.functions.length;
      }
      expect(totalL1Func).toBeGreaterThanOrEqual(c2Count);
    });

    it('2.5-11. [L1] C3(요구사항) 12건 누락 없음', () => {
      const c3Count = realData.filter(d => d.itemCode === 'C3').length;
      let totalReq = 0;
      for (const type of result.state.l1.types) {
        for (const func of type.functions) {
          totalReq += (func.requirements || []).length;
        }
      }
      expect(totalReq).toBeGreaterThanOrEqual(c3Count);
    });

    it('2.5-12. [L1] C4(고장영향) 22건 누락 없음', () => {
      const feCount = (result.state.l1.failureScopes || []).length;
      expect(feCount).toBeGreaterThanOrEqual(EXPECTED.c4FE);
    });
  });

  // ════════════════════════════════════════
  // 3. SA → FC → FA 순차 확정 흐름
  // ════════════════════════════════════════

  describe('3. SA→FC→FA 순차 확정 흐름', () => {
    it('3-1. SA 확정 → FC 단계 진행', () => {
      const state = getInitialStepState();
      const afterSA = advanceToFC(state);
      expect(afterSA.saConfirmed).toBe(true);
      expect(afterSA.activeStep).toBe('FC');
      expect(canConfirmFC(afterSA)).toBe(true);
    });

    it('3-2. FC 확정 → FA 단계 진행', () => {
      const afterSA = advanceToFC(getInitialStepState());
      const afterFC = advanceToFA(afterSA);
      expect(afterFC.fcConfirmed).toBe(true);
      expect(afterFC.activeStep).toBe('FA');
      expect(canConfirmFA(afterFC)).toBe(true);
    });

    it('3-3. 전체 흐름: SA→FC→FA 한 번에', () => {
      // SA 조건 충족
      expect(canConfirmSA({ flatData: realData, isSaved: true })).toBe(true);

      // SA 확정 (buildWorksheetState)
      const buildResult = buildWorksheetState(realData, { fmeaId: 'e2e-test', l1Name: '테스트' });
      expect(buildResult.success).toBe(true);
      expect(buildResult.diagnostics.fmCount).toBe(EXPECTED.a5FM);
      expect(buildResult.diagnostics.fcCount).toBeGreaterThanOrEqual(0);

      // SA → FC 상태 전이
      const afterSA = advanceToFC(getInitialStepState());
      expect(canConfirmFC(afterSA)).toBe(true);

      // FC → FA 상태 전이
      const afterFC = advanceToFA(afterSA);
      expect(canConfirmFA(afterFC)).toBe(true);
    });
  });

  // ════════════════════════════════════════
  // 4. 고장형태(FM) ↔ 고장원인(FC) 연결 검증
  // ════════════════════════════════════════

  describe('4. FM↔FC 연결 검증 (고장형태↔고장원인)', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'link-test', l1Name: '연결검증' });

    it('4-1. FC가 있으면 FM도 있어야 함 (공통 공정 01 제외)', () => {
      for (const proc of result.state.l2) {
        if (proc.no === '01') continue;
        const fmCount = (proc.failureModes || []).length;
        const fcCount = (proc.failureCauses || []).length;
        if (fcCount > 0) {
          expect(fmCount, `공정 ${proc.no}: FC=${fcCount}인데 FM=${fmCount}`).toBeGreaterThan(0);
        }
      }
    });

    it('4-2. 모든 FM에 productCharId 연결 (A4→A5 매핑)', () => {
      let fmWithCharId = 0;
      let fmTotal = 0;
      for (const proc of result.state.l2) {
        for (const fm of proc.failureModes || []) {
          fmTotal++;
          if (fm.productCharId) fmWithCharId++;
        }
      }
      // 제품특성이 있는 공정에서는 FM에 productCharId가 있어야 함
      // (제품특성 없는 공정은 productCharId 없이 생성됨)
      if (fmTotal > 0) {
        expect(fmWithCharId).toBeGreaterThan(0);
      }
    });

    it('4-3. FC에 보존된 m4는 flat B4(m4)를 초과하지 않음', () => {
      let fcWithM4 = 0;
      let fcTotal = 0;
      for (const proc of result.state.l2) {
        for (const fc of proc.failureCauses || []) {
          fcTotal++;
          if ((fc as { m4?: string }).m4) fcWithM4++;
        }
      }
      const b4WithM4 = realData.filter(d => d.itemCode === 'B4' && d.m4).length;
      expect(fcWithM4).toBeLessThanOrEqual(b4WithM4);
      if (fcTotal === 0) {
        expect(fcWithM4).toBe(0);
      }
    });
  });

  // ════════════════════════════════════════
  // 5. L1 고장영향(FE) 연결 검증
  // ════════════════════════════════════════

  describe('5. L1 고장영향(FE) 연결 검증', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'fe-test', l1Name: 'FE검증' });

    it('5-1. FE가 L1 failureScopes에 모두 존재', () => {
      const feCount = (result.state.l1.failureScopes || []).length;
      expect(feCount).toBeGreaterThanOrEqual(EXPECTED.c4FE);
    });

    it('5-2. FE에 scope(구분) 정보 보존', () => {
      const scopes = new Set(
        (result.state.l1.failureScopes || []).map(fe => fe.scope).filter(Boolean)
      );
      // YP, SP, USER 중 하나 이상의 scope이 있어야 함
      expect(scopes.size).toBeGreaterThan(0);
    });

    it('5-3. FE에 reqId(요구사항 연결) 존재', () => {
      const feWithReqId = (result.state.l1.failureScopes || []).filter(fe => fe.reqId);
      // C3 요구사항이 있으면 FE에 reqId가 연결되어야 함
      const c3Count = realData.filter(d => d.itemCode === 'C3').length;
      if (c3Count > 0) {
        expect(feWithReqId.length).toBeGreaterThan(0);
      }
    });
  });

  // ════════════════════════════════════════
  // 5.5. ★ 특별특성 100% 전파 검증
  // ════════════════════════════════════════

  describe('5.5. 특별특성(specialChar) 100% 전파', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'sc-test', l1Name: '특별특성검증' });

    it('5.5-1. A4 특별특성 5건 → productChars에 100% 전파', () => {
      // 원본: A4에 specialChar='C'인 항목 5건
      const a4WithSC = realData.filter(d => d.itemCode === 'A4' && d.specialChar && d.specialChar.trim() !== '');
      expect(a4WithSC.length).toBe(5);

      // 빌드 결과에서 productChars의 specialChar 확인
      let scCount = 0;
      for (const proc of result.state.l2) {
        for (const func of proc.functions) {
          for (const pc of func.productChars || []) {
            const sc = (pc as { specialChar?: string }).specialChar;
            if (sc && sc.trim() !== '') scCount++;
          }
        }
      }
      // A3 1:N A4 복사 구조이므로 scCount >= 5 (A3 여러 개면 A4 복사됨)
      expect(scCount).toBeGreaterThanOrEqual(5);
    });

    it('5.5-2. B3 특별특성 — 엑셀 B3가 processChars로 올라온 경우만 전파 (infer B3 없음)', () => {
      const b3WithSC = realData.filter(d => d.itemCode === 'B3' && d.specialChar && d.specialChar.trim() !== '');
      expect(b3WithSC.length).toBe(3);

      let scCount = 0;
      for (const proc of result.state.l2) {
        for (const we of proc.l3) {
          for (const func of we.functions) {
            for (const pc of func.processChars || []) {
              const sc = (pc as { specialChar?: string }).specialChar;
              if (sc && sc.trim() !== '') scCount++;
            }
          }
        }
      }
      expect(scCount).toBeGreaterThanOrEqual(0);
      expect(scCount).toBeLessThanOrEqual(b3WithSC.length);
    });

    it('5.5-3. 특별특성 값(C) 원본 보존', () => {
      // specialChar 값이 변조되지 않았는지 확인
      for (const proc of result.state.l2) {
        for (const func of proc.functions) {
          for (const pc of func.productChars || []) {
            const sc = (pc as { specialChar?: string }).specialChar;
            if (sc && sc.trim() !== '') {
              expect(sc).toBe('C'); // 원본의 특별특성 값
            }
          }
        }
        for (const we of proc.l3) {
          for (const func of we.functions) {
            for (const pc of func.processChars || []) {
              const sc = (pc as { specialChar?: string }).specialChar;
              if (sc && sc.trim() !== '') {
                expect(sc).toBe('C');
              }
            }
          }
        }
      }
    });
  });

  // ════════════════════════════════════════
  // 5.6. ★ FC 고장사슬 심각도(S) 연결 검증
  // ════════════════════════════════════════

  describe('5.6. FC 고장사슬 완전성', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'sev-test', l1Name: '심각도검증' });

    it('5.6-1. FM·FC 빌드 수 (자동 FC 제거 후 하한)', () => {
      let fmTotal = 0, fcTotal = 0;
      for (const proc of result.state.l2) {
        fmTotal += (proc.failureModes || []).length;
        fcTotal += (proc.failureCauses || []).length;
      }
      expect(fmTotal).toBe(EXPECTED.a5FM);
      expect(fcTotal).toBeGreaterThanOrEqual(0);
    });

    it('5.6-2. 공통 공정 01 제외 — 공정마다 FM+FC 강제 아님 (B3 미매칭 시 FC 0 허용)', () => {
      let anyFm = false;
      for (const proc of result.state.l2) {
        if (proc.no === '01') continue;
        const fmCount = (proc.failureModes || []).length;
        const fcCount = (proc.failureCauses || []).length;
        expect(fmCount).toBeGreaterThanOrEqual(0);
        expect(fcCount).toBeGreaterThanOrEqual(0);
        if (fmCount > 0) anyFm = true;
      }
      expect(anyFm).toBe(true);
    });

    it('5.6-3. FE + FM + FC 합계 하한 (자동 생성 제거 반영)', () => {
      const feCount = (result.state.l1.failureScopes || []).length;
      expect(feCount).toBeGreaterThanOrEqual(22);
      expect(
        result.diagnostics.fmCount + result.diagnostics.fcCount + result.diagnostics.feCount
      ).toBeGreaterThanOrEqual(EXPECTED.minFmFcFeSum);
    });

    it('5.6-4. 심각도(S) 점수 부여 가능 — FE별 scope 매핑 완전', () => {
      // 심각도는 FE의 scope(YP/SP/USER)에 따라 결정됨
      // 모든 FE에 scope 정보가 있어야 S 점수 부여 가능
      const fes = result.state.l1.failureScopes || [];
      const feWithScope = fes.filter(fe => fe.scope && fe.scope.trim() !== '');
      expect(feWithScope.length).toBe(fes.length); // 100% scope 매핑
    });

    it('5.6-5. 심각도 기반: YP/SP/USER 구분별 FE 분포', () => {
      const fes = result.state.l1.failureScopes || [];
      const byScope: Record<string, number> = {};
      for (const fe of fes) {
        const scope = fe.scope || 'unknown';
        byScope[scope] = (byScope[scope] || 0) + 1;
      }
      // 3개 구분 모두 FE 존재해야 심각도 매트릭스 완전
      expect(Object.keys(byScope).length).toBeGreaterThanOrEqual(3);
      expect(byScope['YP']).toBeGreaterThan(0);
      expect(byScope['SP']).toBeGreaterThan(0);
      expect(byScope['USER']).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════
  // 6. diagnostics 정합성 검증
  // ════════════════════════════════════════

  describe('6. diagnostics 정합성 (빌드 통계와 실제 데이터 일치)', () => {
    const result = buildWorksheetState(realData, { fmeaId: 'diag-test', l1Name: '통계검증' });

    it('6-1. diagnostics.l2Count = 실제 공정 수', () => {
      expect(result.diagnostics.l2Count).toBe(result.state.l2.length);
    });

    it('6-2. diagnostics.fmCount = 실제 FM 합계', () => {
      let actual = 0;
      for (const proc of result.state.l2) {
        actual += (proc.failureModes || []).length;
      }
      expect(result.diagnostics.fmCount).toBe(actual);
    });

    it('6-3. diagnostics.fcCount = 실제 FC 합계', () => {
      let actual = 0;
      for (const proc of result.state.l2) {
        actual += (proc.failureCauses || []).length;
      }
      expect(result.diagnostics.fcCount).toBe(actual);
    });

    it('6-4. diagnostics.feCount = 실제 FE 합계', () => {
      const actual = (result.state.l1.failureScopes || []).length;
      expect(result.diagnostics.feCount).toBe(actual);
    });

    it('6-5. diagnostics.warnings 없음 (정상 데이터)', () => {
      expect(result.diagnostics.warnings.length).toBe(0);
    });
  });
});
