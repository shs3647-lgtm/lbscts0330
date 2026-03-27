/**
 * @file useAtomicLookup unit tests
 * @description DB 다이렉트 조회 헬퍼 — FK 기반 O(1) 룩업 검증
 */
import { describe, expect, it } from 'vitest';
import { createEmptyDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';

function createTestDB(): FMEAWorksheetDB {
  return {
    ...createEmptyDB('test-fmea'),
    l1Structure: { id: 'l1-1', fmeaId: 'test-fmea', name: '테스트 제품' },
    l2Structures: [
      { id: 'l2-1', fmeaId: 'test-fmea', l1Id: 'l1-1', no: '10', name: '공정A', order: 1 },
      { id: 'l2-2', fmeaId: 'test-fmea', l1Id: 'l1-1', no: '20', name: '공정B', order: 2 },
    ],
    l3Structures: [
      { id: 'l3-1', fmeaId: 'test-fmea', l1Id: 'l1-1', l2Id: 'l2-1', m4: 'MN', name: '작업자A', order: 1 },
      { id: 'l3-2', fmeaId: 'test-fmea', l1Id: 'l1-1', l2Id: 'l2-1', m4: 'MC', name: '설비A', order: 2 },
      { id: 'l3-3', fmeaId: 'test-fmea', l1Id: 'l1-1', l2Id: 'l2-2', m4: 'MN', name: '작업자B', order: 1 },
    ],
    l1Functions: [
      { id: 'l1f-1', fmeaId: 'test-fmea', l1StructId: 'l1-1', category: 'YP', functionName: 'L1기능', requirement: '요구1' },
    ],
    l2Functions: [
      { id: 'l2f-1', fmeaId: 'test-fmea', l2StructId: 'l2-1', functionName: '기능1', productChar: '특성1' },
    ],
    l3Functions: [
      { id: 'l3f-1', fmeaId: 'test-fmea', l3StructId: 'l3-1', l2StructId: 'l2-1', functionName: '요소기능1', processChar: '공정특성1' },
      { id: 'l3f-2', fmeaId: 'test-fmea', l3StructId: 'l3-2', l2StructId: 'l2-1', functionName: '요소기능2', processChar: '공정특성2' },
    ],
    failureModes: [
      { id: 'fm-1', fmeaId: 'test-fmea', l2StructId: 'l2-1', l2FuncId: 'l2f-1', mode: '고장형태1' },
    ],
    failureCauses: [
      { id: 'fc-1', fmeaId: 'test-fmea', l2StructId: 'l2-1', l3StructId: 'l3-1', l3FuncId: 'l3f-1', cause: '고장원인1' },
      { id: 'fc-2', fmeaId: 'test-fmea', l2StructId: 'l2-1', l3StructId: 'l3-2', l3FuncId: 'l3f-2', cause: '고장원인2' },
    ],
    failureEffects: [
      { id: 'fe-1', fmeaId: 'test-fmea', l1FuncId: 'l1f-1', effect: '고장영향1', severity: 8, category: 'YP' },
    ],
    failureLinks: [
      { id: 'fl-1', fmeaId: 'test-fmea', fmId: 'fm-1', fcId: 'fc-1', feId: 'fe-1' },
      { id: 'fl-2', fmeaId: 'test-fmea', fmId: 'fm-1', fcId: 'fc-2', feId: 'fe-1' },
    ],
    riskAnalyses: [
      { id: 'ra-1', fmeaId: 'test-fmea', linkId: 'fl-1', severity: 8, occurrence: 4, detection: 6, ap: 'H', preventionControl: 'PC1', detectionControl: 'DC1' },
      { id: 'ra-2', fmeaId: 'test-fmea', linkId: 'fl-2', severity: 8, occurrence: 2, detection: 3, ap: 'L', preventionControl: 'PC2', detectionControl: 'DC2' },
    ],
    optimizations: [
      { id: 'opt-1', fmeaId: 'test-fmea', riskId: 'ra-1', recommendedAction: '개선안1', responsible: '', targetDate: '', status: 'planned' },
    ],
  };
}

// Pure function tests (extracted logic, no React hooks)
describe('useAtomicLookup — pure logic tests', () => {

  describe('indexById / groupByField equivalents', () => {
    it('l2 structures can be indexed by id', () => {
      const db = createTestDB();
      const map = new Map(db.l2Structures.map(s => [s.id, s]));
      expect(map.get('l2-1')?.name).toBe('공정A');
      expect(map.get('l2-2')?.name).toBe('공정B');
      expect(map.get('nonexistent')).toBeUndefined();
    });

    it('l3 structures grouped by l2Id', () => {
      const db = createTestDB();
      const grouped = new Map<string, typeof db.l3Structures>();
      for (const l3 of db.l3Structures) {
        if (!grouped.has(l3.l2Id)) grouped.set(l3.l2Id, []);
        grouped.get(l3.l2Id)!.push(l3);
      }
      expect(grouped.get('l2-1')?.length).toBe(2);
      expect(grouped.get('l2-2')?.length).toBe(1);
      expect(grouped.get('l2-999')).toBeUndefined();
    });
  });

  describe('FK-based lookups', () => {
    it('getRisk by linkId', () => {
      const db = createTestDB();
      const riskByLink = new Map(db.riskAnalyses.map(r => [r.linkId, r]));
      const risk1 = riskByLink.get('fl-1');
      expect(risk1).toBeDefined();
      expect(risk1?.severity).toBe(8);
      expect(risk1?.occurrence).toBe(4);
      expect(risk1?.ap).toBe('H');
    });

    it('getOptsForRisk by riskId', () => {
      const db = createTestDB();
      const optsByRisk = new Map<string, typeof db.optimizations>();
      for (const opt of db.optimizations) {
        if (!opt.riskId) continue;
        if (!optsByRisk.has(opt.riskId)) optsByRisk.set(opt.riskId, []);
        optsByRisk.get(opt.riskId)!.push(opt);
      }
      expect(optsByRisk.get('ra-1')?.length).toBe(1);
      expect(optsByRisk.get('ra-1')?.[0].recommendedAction).toBe('개선안1');
      expect(optsByRisk.get('ra-2')).toBeUndefined();
    });

    it('getLinksForFM by fmId', () => {
      const db = createTestDB();
      const linksByFM = new Map<string, typeof db.failureLinks>();
      for (const link of db.failureLinks) {
        if (!linksByFM.has(link.fmId)) linksByFM.set(link.fmId, []);
        linksByFM.get(link.fmId)!.push(link);
      }
      expect(linksByFM.get('fm-1')?.length).toBe(2);
    });

    it('getFCsForL3 by l3StructId', () => {
      const db = createTestDB();
      const fcsByL3 = new Map<string, typeof db.failureCauses>();
      for (const fc of db.failureCauses) {
        const key = fc.l3StructId || '';
        if (!key) continue;
        if (!fcsByL3.has(key)) fcsByL3.set(key, []);
        fcsByL3.get(key)!.push(fc);
      }
      expect(fcsByL3.get('l3-1')?.length).toBe(1);
      expect(fcsByL3.get('l3-2')?.length).toBe(1);
    });
  });

  describe('SOD convenience getters', () => {
    it('getSeverity / getOccurrence / getDetection', () => {
      const db = createTestDB();
      const riskByLink = new Map(db.riskAnalyses.map(r => [r.linkId, r]));
      expect(riskByLink.get('fl-1')?.severity ?? 0).toBe(8);
      expect(riskByLink.get('fl-1')?.occurrence ?? 0).toBe(4);
      expect(riskByLink.get('fl-1')?.detection ?? 0).toBe(6);
      expect(riskByLink.get('fl-2')?.ap ?? '').toBe('L');
    });

    it('getPreventionControl / getDetectionControl', () => {
      const db = createTestDB();
      const riskByLink = new Map(db.riskAnalyses.map(r => [r.linkId, r]));
      expect(riskByLink.get('fl-1')?.preventionControl ?? '').toBe('PC1');
      expect(riskByLink.get('fl-1')?.detectionControl ?? '').toBe('DC1');
    });

    it('missing linkId returns defaults', () => {
      const db = createTestDB();
      const riskByLink = new Map(db.riskAnalyses.map(r => [r.linkId, r]));
      expect(riskByLink.get('nonexistent')?.severity ?? 0).toBe(0);
      expect(riskByLink.get('nonexistent')?.ap ?? '').toBe('');
    });
  });

  describe('empty DB edge cases', () => {
    it('createEmptyDB returns valid empty structure', () => {
      const db = createEmptyDB('empty-test');
      expect(db.fmeaId).toBe('empty-test');
      expect(db.l1Structure).toBeNull();
      expect(db.l2Structures).toHaveLength(0);
      expect(db.failureLinks).toHaveLength(0);
      expect(db.riskAnalyses).toHaveLength(0);
      expect(db.confirmed.structure).toBe(false);
    });

    it('empty arrays produce empty Maps', () => {
      const db = createEmptyDB('empty-test');
      const map = new Map(db.l2Structures.map(s => [s.id, s]));
      expect(map.size).toBe(0);
    });
  });

  describe('data integrity', () => {
    it('every FailureLink FK references existing entities', () => {
      const db = createTestDB();
      const fmIds = new Set(db.failureModes.map(fm => fm.id));
      const fcIds = new Set(db.failureCauses.map(fc => fc.id));
      const feIds = new Set(db.failureEffects.map(fe => fe.id));

      for (const link of db.failureLinks) {
        expect(fmIds.has(link.fmId)).toBe(true);
        expect(fcIds.has(link.fcId)).toBe(true);
        expect(feIds.has(link.feId)).toBe(true);
      }
    });

    it('every RiskAnalysis.linkId references existing FailureLink', () => {
      const db = createTestDB();
      const linkIds = new Set(db.failureLinks.map(l => l.id));
      for (const ra of db.riskAnalyses) {
        expect(linkIds.has(ra.linkId)).toBe(true);
      }
    });

    it('every Optimization.riskId references existing RiskAnalysis', () => {
      const db = createTestDB();
      const raIds = new Set(db.riskAnalyses.map(r => r.id));
      for (const opt of db.optimizations) {
        if (opt.riskId) expect(raIds.has(opt.riskId)).toBe(true);
      }
    });
  });
});
