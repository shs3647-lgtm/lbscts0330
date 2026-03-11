/**
 * @file sync-a6b5-exclusion.test.ts
 * @description A6(검출관리)/B5(예방관리) 워크시트→마스터 역동기화 제거 검증
 *
 * 핵심 규칙:
 * - Import 기초정보(PfmeaMasterFlatItem)와 ALL화면 리스크분석(RiskAnalysis)은 별도 DB
 * - extractMasterFlatItemsFromWorksheet()에서 A6/B5 항목이 생성되지 않아야 함
 * - A1~A5, B1~B4, C1~C4는 정상 동기화
 */
import { describe, it, expect } from 'vitest';
import { extractMasterFlatItemsFromWorksheet } from '@/app/api/pfmea/master/sync';
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';

// 최소한의 FMEAWorksheetDB mock
function makeWorksheetDB(overrides: Partial<FMEAWorksheetDB> = {}): FMEAWorksheetDB {
  return {
    fmeaId: 'test-fmea-1',
    savedAt: new Date().toISOString(),
    l1Structure: null,
    l2Structures: [
      { id: 'l2-1', fmeaId: 'test-fmea-1', l1Id: 'l1-1', no: '10', name: '절단', order: 1 },
      { id: 'l2-2', fmeaId: 'test-fmea-1', l1Id: 'l1-1', no: '20', name: '용접', order: 2 },
    ],
    l3Structures: [
      { id: 'l3-1', fmeaId: 'test-fmea-1', l2Id: 'l2-1', name: '작업자', m4: 'MN', order: 1 },
    ],
    l1Functions: [
      { id: 'l1f-1', fmeaId: 'test-fmea-1', l1StructId: 'l1-1', category: 'YP', functionName: '제품기능1', requirement: '요구사항1' },
    ],
    l2Functions: [
      { id: 'l2f-1', fmeaId: 'test-fmea-1', l2StructId: 'l2-1', functionName: '공정기능1', productChar: '치수', l1FuncId: 'l1f-1' },
    ],
    l3Functions: [
      { id: 'l3f-1', fmeaId: 'test-fmea-1', l2StructId: 'l2-1', l3StructId: 'l3-1', functionName: '요소기능1', processChar: '토크' },
    ],
    failureEffects: [
      { id: 'fe-1', fmeaId: 'test-fmea-1', effect: '고장영향1', category: 'YP', severity: 8 },
    ],
    failureModes: [
      { id: 'fm-1', fmeaId: 'test-fmea-1', l2StructId: 'l2-1', mode: '고장형태1' },
    ],
    failureCauses: [
      { id: 'fc-1', fmeaId: 'test-fmea-1', l3FuncId: 'l3f-1', cause: '고장원인1' },
    ],
    failureLinks: [
      { id: 'lk-1', fmeaId: 'test-fmea-1', fmId: 'fm-1', feId: 'fe-1', fcId: 'fc-1' },
    ],
    failureAnalyses: [],
    // ★ RiskAnalysis에 검출관리/예방관리 데이터가 있어도 동기화 안 됨
    riskAnalyses: [
      {
        id: 'ra-1', fmeaId: 'test-fmea-1', linkId: 'lk-1',
        severity: 8, occurrence: 4, detection: 3, ap: 'M' as const,
        preventionControl: 'P:예방관리항목1',
        detectionControl: 'D:검출관리항목1',
      },
    ],
    optimizations: [],
    confirmed: {
      structure: true, l1Function: true, l2Function: true, l3Function: true,
      l1Failure: true, l2Failure: true, l3Failure: true,
      failureLink: true, risk: true, optimization: false,
    },
    ...overrides,
  } as unknown as FMEAWorksheetDB;
}

describe('extractMasterFlatItemsFromWorksheet - A6/B5 역동기화 제거', () => {

  // ═══════════════════════════════════════════════════════
  // TEST 1: A6(검출관리) 항목이 생성되지 않아야 함
  // ═══════════════════════════════════════════════════════
  it('A6(검출관리) 항목이 추출되지 않음', () => {
    const db = makeWorksheetDB();
    const items = extractMasterFlatItemsFromWorksheet(db);

    const a6Items = items.filter(i => i.itemCode === 'A6');
    expect(a6Items).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 2: B5(예방관리) 항목이 생성되지 않아야 함
  // ═══════════════════════════════════════════════════════
  it('B5(예방관리) 항목이 추출되지 않음', () => {
    const db = makeWorksheetDB();
    const items = extractMasterFlatItemsFromWorksheet(db);

    const b5Items = items.filter(i => i.itemCode === 'B5');
    expect(b5Items).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 3: RiskAnalysis에 데이터가 있어도 A6/B5 생성 안 됨
  // ═══════════════════════════════════════════════════════
  it('RiskAnalysis에 preventionControl/detectionControl이 있어도 A6/B5 무시', () => {
    const db = makeWorksheetDB({
      riskAnalyses: [
        {
          id: 'ra-1', fmeaId: 'test-fmea-1', linkId: 'lk-1',
          severity: 8, occurrence: 4, detection: 3, ap: 'M' as const,
          preventionControl: 'P:예방관리1\nP:예방관리2',
          detectionControl: 'D:검출관리1\nD:검출관리2',
        },
        {
          id: 'ra-2', fmeaId: 'test-fmea-1', linkId: 'lk-1',
          severity: 6, occurrence: 5, detection: 4, ap: 'H' as const,
          preventionControl: 'P:예방관리3',
          detectionControl: 'D:검출관리3',
        },
      ] as any[],
    });

    const items = extractMasterFlatItemsFromWorksheet(db);
    const controlItems = items.filter(i => i.itemCode === 'A6' || i.itemCode === 'B5');
    expect(controlItems).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 4: A1~A5, B1~B4, C1~C4는 정상 동기화
  // ═══════════════════════════════════════════════════════
  it('A1~A5 항목은 정상 추출', () => {
    const db = makeWorksheetDB();
    const items = extractMasterFlatItemsFromWorksheet(db);

    expect(items.some(i => i.itemCode === 'A1')).toBe(true); // 공정번호
    expect(items.some(i => i.itemCode === 'A2')).toBe(true); // 공정명
    expect(items.some(i => i.itemCode === 'A3')).toBe(true); // 공정기능
    expect(items.some(i => i.itemCode === 'A4')).toBe(true); // 제품특성
    expect(items.some(i => i.itemCode === 'A5')).toBe(true); // 고장형태
  });

  it('B1~B4 항목은 정상 추출', () => {
    const db = makeWorksheetDB();
    const items = extractMasterFlatItemsFromWorksheet(db);

    expect(items.some(i => i.itemCode === 'B1')).toBe(true); // 작업요소
    expect(items.some(i => i.itemCode === 'B2')).toBe(true); // 요소기능
    expect(items.some(i => i.itemCode === 'B3')).toBe(true); // 공정특성
    expect(items.some(i => i.itemCode === 'B4')).toBe(true); // 고장원인
  });

  it('C1~C4 항목은 정상 추출', () => {
    const db = makeWorksheetDB();
    const items = extractMasterFlatItemsFromWorksheet(db);

    expect(items.some(i => i.itemCode === 'C1')).toBe(true); // 구분
    expect(items.some(i => i.itemCode === 'C2')).toBe(true); // 제품기능
    expect(items.some(i => i.itemCode === 'C3')).toBe(true); // 요구사항
    expect(items.some(i => i.itemCode === 'C4')).toBe(true); // 고장영향
  });

  // ═══════════════════════════════════════════════════════
  // TEST 5: 빈 RiskAnalysis에서도 A6/B5 없음
  // ═══════════════════════════════════════════════════════
  it('빈 riskAnalyses 배열에서도 A6/B5 항목 없음', () => {
    const db = makeWorksheetDB({ riskAnalyses: [] });
    const items = extractMasterFlatItemsFromWorksheet(db);

    const controlItems = items.filter(i => i.itemCode === 'A6' || i.itemCode === 'B5');
    expect(controlItems).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 6: sourceFmeaId 설정 확인
  // ═══════════════════════════════════════════════════════
  it('추출된 항목에 sourceFmeaId가 설정됨', () => {
    const db = makeWorksheetDB();
    const items = extractMasterFlatItemsFromWorksheet(db);

    items.forEach(item => {
      expect(item.sourceFmeaId).toBe('test-fmea-1');
    });
  });
});
