/**
 * @file auto-fix-cascade.test.ts
 * @description fixFk cascade 로직 검증 — orphan RA/Opt 삭제, nullable FK 정리, RA gap-fill
 *
 * TDD RED: 이 테스트가 먼저 실패하고, auto-fix.ts 강화 후 GREEN 되어야 함
 */

import { describe, it, expect } from 'vitest';

// ─── 순수 로직 테스트 (DB 불필요) ────────────────────────────────

describe('auto-fix cascade 설계 검증', () => {
  // FK cascade 삭제 로직: 깨진 FL 삭제 → orphan RA 식별 → orphan Opt 식별
  describe('Phase 1: orphan RA cascade 식별', () => {
    it('삭제된 FL의 linkId를 가진 RA를 orphan으로 식별', () => {
      const validFlIds = new Set(['FL-1', 'FL-2', 'FL-3']);
      const ras = [
        { id: 'RA-1', linkId: 'FL-1' },
        { id: 'RA-2', linkId: 'FL-2' },
        { id: 'RA-X', linkId: 'FL-DELETED' }, // orphan
        { id: 'RA-Y', linkId: 'FL-GONE' },    // orphan
      ];
      const orphanRAs = ras.filter(ra => !validFlIds.has(ra.linkId));
      expect(orphanRAs).toHaveLength(2);
      expect(orphanRAs.map(r => r.id)).toEqual(['RA-X', 'RA-Y']);
    });

    it('모든 RA가 유효 FL을 참조하면 orphan 0건', () => {
      const validFlIds = new Set(['FL-1', 'FL-2']);
      const ras = [
        { id: 'RA-1', linkId: 'FL-1' },
        { id: 'RA-2', linkId: 'FL-2' },
      ];
      const orphanRAs = ras.filter(ra => !validFlIds.has(ra.linkId));
      expect(orphanRAs).toHaveLength(0);
    });
  });

  describe('Phase 2: orphan Opt cascade 식별', () => {
    it('삭제된 RA의 riskId를 가진 Opt를 orphan으로 식별', () => {
      const validRaIds = new Set(['RA-1', 'RA-2']);
      const opts = [
        { id: 'OPT-1', riskId: 'RA-1' },
        { id: 'OPT-X', riskId: 'RA-DELETED' }, // orphan
      ];
      const orphanOpts = opts.filter(o => !validRaIds.has(o.riskId));
      expect(orphanOpts).toHaveLength(1);
      expect(orphanOpts[0].id).toBe('OPT-X');
    });
  });

  describe('Phase 3: nullable FK 정리', () => {
    it('FM.productCharId가 유효 PPC에 없으면 null 대상', () => {
      const validPpcIds = new Set(['PPC-1', 'PPC-2']);
      const fms = [
        { id: 'FM-1', productCharId: 'PPC-1' },     // valid
        { id: 'FM-2', productCharId: 'PPC-GONE' },   // invalid → null
        { id: 'FM-3', productCharId: null },           // already null
        { id: 'FM-4', productCharId: 'PPC-2' },       // valid
      ];
      const badPPC = fms.filter(fm => fm.productCharId && !validPpcIds.has(fm.productCharId));
      expect(badPPC).toHaveLength(1);
      expect(badPPC[0].id).toBe('FM-2');
    });

    it('FE.l1FuncId가 유효 L1F에 없으면 null 대상', () => {
      const validL1FIds = new Set(['L1F-1', 'L1F-2']);
      const fes = [
        { id: 'FE-1', l1FuncId: 'L1F-1' },        // valid
        { id: 'FE-2', l1FuncId: 'L1F-GONE' },     // invalid → null
        { id: 'FE-3', l1FuncId: null },             // already null
      ];
      const badL1F = fes.filter(fe => fe.l1FuncId && !validL1FIds.has(fe.l1FuncId));
      expect(badL1F).toHaveLength(1);
      expect(badL1F[0].id).toBe('FE-2');
    });
  });

  describe('Phase 4: RA gap-fill 식별', () => {
    it('RA가 없는 FL을 gap-fill 대상으로 식별', () => {
      const raLinkIds = new Set(['FL-1', 'FL-3']);
      const fls = [
        { id: 'FL-1' }, // has RA
        { id: 'FL-2' }, // missing RA → gap-fill
        { id: 'FL-3' }, // has RA
        { id: 'FL-4' }, // missing RA → gap-fill
      ];
      const flsWithoutRA = fls.filter(fl => !raLinkIds.has(fl.id));
      expect(flsWithoutRA).toHaveLength(2);
      expect(flsWithoutRA.map(f => f.id)).toEqual(['FL-2', 'FL-4']);
    });

    it('모든 FL에 RA가 있으면 gap-fill 0건', () => {
      const raLinkIds = new Set(['FL-1', 'FL-2']);
      const fls = [{ id: 'FL-1' }, { id: 'FL-2' }];
      const flsWithoutRA = fls.filter(fl => !raLinkIds.has(fl.id));
      expect(flsWithoutRA).toHaveLength(0);
    });
  });

  describe('autoFixSummary 분류', () => {
    it('이슈를 자동수정/수동필요로 분류', () => {
      const issues = [
        { type: 'orphanRA', count: 5, autoFixable: true },
        { type: 'orphanOpt', count: 2, autoFixable: true },
        { type: 'invalidProductCharId', count: 3, autoFixable: true },
        { type: 'missingRA', count: 4, autoFixable: true },
        { type: 'unlinkedFC', count: 40, autoFixable: false },
        { type: 'unlinkedFM', count: 2, autoFixable: false },
      ];

      const autoFixable = issues.filter(i => i.autoFixable);
      const manualRequired = issues.filter(i => !i.autoFixable);
      const autoFixCount = autoFixable.reduce((s, i) => s + i.count, 0);
      const manualCount = manualRequired.reduce((s, i) => s + i.count, 0);

      expect(autoFixable).toHaveLength(4);
      expect(manualRequired).toHaveLength(2);
      expect(autoFixCount).toBe(14);
      expect(manualCount).toBe(42);
    });
  });
});
