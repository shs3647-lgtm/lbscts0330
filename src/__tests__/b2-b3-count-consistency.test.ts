/**
 * @file b2-b3-count-consistency.test.ts
 * @description B2/B3 카운트 기준 통일 검증 — 대책A
 *
 * 문제: Import 카운트(전체 행 수)와 DB 카운트(DISTINCT) 기준이 달라 불일치 발생
 *   - B2: Import=129(전체 행), DB=128(DISTINCT l3StructId+functionName) → 차이 1
 *   - B3: Import=129(전체 행), DB=126(processChar!='' 필터) → 차이 3
 *
 * 개선: Import와 WS 모두 DISTINCT 기준으로 통일
 *
 * @created 2026-03-02
 */

import { describe, it, expect } from 'vitest';
import { computeCountComparison } from '../app/(fmea-core)/pfmea/worksheet/hooks/useFailureLinkVerify';

// ─── 테스트 데이터 ─────────────────────────────

/** B2(작업요소기능) 중복 데이터: 같은 processNo + 같은 value가 2건 */
const flatItemsWithDuplicateB2 = [
  // 공정 10에 B2 "요소기능A"가 2건 (중복 — DISTINCT 시 1건)
  { processNo: '10', category: '', itemCode: 'B2', value: '요소기능A' },
  { processNo: '10', category: '', itemCode: 'B2', value: '요소기능A' },  // ← 중복
  // 공정 10에 B2 "요소기능B" 1건
  { processNo: '10', category: '', itemCode: 'B2', value: '요소기능B' },
  // 공정 20에 B2 "요소기능A" 1건 (공정이 다르므로 별도)
  { processNo: '20', category: '', itemCode: 'B2', value: '요소기능A' },
];
// 전체 행: 4건, DISTINCT(processNo, value): 3건

/** B3(공정특성) 빈값 포함 데이터 */
const flatItemsWithEmptyB3 = [
  { processNo: '10', category: '', itemCode: 'B3', value: '공정특성X' },
  { processNo: '10', category: '', itemCode: 'B3', value: '' },         // ← 빈값
  { processNo: '10', category: '', itemCode: 'B3', value: '공정특성Y' },
  { processNo: '20', category: '', itemCode: 'B3', value: '  ' },       // ← 공백만
  { processNo: '20', category: '', itemCode: 'B3', value: '공정특성Z' },
];
// 전체 행: 5건, 빈값 제외: 3건, DISTINCT(processNo, value): 3건

/** 혼합 데이터: B2 중복 + B3 빈값 */
const mixedFlatItems = [
  ...flatItemsWithDuplicateB2,
  ...flatItemsWithEmptyB3,
  // 다른 itemCode도 추가 (정상 동작 확인)
  { processNo: '10', category: '', itemCode: 'A2', value: '세척공정' },
  { processNo: '20', category: '', itemCode: 'A2', value: '도장공정' },
  { processNo: '10', category: '', itemCode: 'A5', value: '오염' },
  { processNo: '10', category: '', itemCode: 'B4', value: '세척불량' },
];

/** 워크시트 state — B2 중복 시뮬레이션 */
const stateWithDuplicateB2: Record<string, unknown> = {
  l2: [
    {
      no: '10', name: '세척공정',
      functions: [{ name: '공정기능1', productChars: ['제품특성1'] }],
      l3: [
        {
          id: 'l3-1', name: '작업요소1', m4: 'MN',
          functions: [
            // 같은 function이 다른 processChar와 매핑 → DB에서 2행이지만 DISTINCT=1
            { name: '요소기능A', processChars: [{ id: 'pc1', name: '공정특성X' }] },
            { name: '요소기능A', processChars: [{ id: 'pc2', name: '공정특성Y' }] }, // ← 같은 함수명
            { name: '요소기능B', processChars: [{ id: 'pc3', name: '공정특성Z' }] },
          ],
          failureCauses: [],
        },
      ],
      failureModes: [{ id: 'fm1', mode: '오염' }],
      failureCauses: [],
    },
    {
      no: '20', name: '도장공정',
      functions: [{ name: '공정기능2', productChars: ['제품특성2'] }],
      l3: [
        {
          id: 'l3-2', name: '작업요소2', m4: 'MC',
          functions: [
            { name: '요소기능A', processChars: [{ id: 'pc4', name: '공정특성W' }] },
          ],
          failureCauses: [],
        },
      ],
      failureModes: [],
      failureCauses: [],
    },
  ],
  l1: {
    name: '테스트 완제품',
    types: [],
    failureScopes: [],
  },
};

// ─── 테스트 ─────────────────────────────

describe('B2/B3 카운트 기준 통일 (대책A)', () => {

  describe('B2 (작업요소기능) total count 카운트', () => {

    it('B2 Import 카운트는 total count 기준이어야 한다 (커밋 0a1032a8 검증: I=129, D=129)', () => {
      const result = computeCountComparison(mixedFlatItems, stateWithDuplicateB2, []);
      const b2Row = result.find(r => r.itemCode === 'B2');
      expect(b2Row).toBeDefined();
      // total count = 4건 (중복 포함)
      // ★ B2는 DISTINCT 불필요 — 실제 데이터 검증 완료 (I=129=D=129)
      expect(b2Row!.importCount).toBe(4);  // ★ total count 기준
    });

    it('B2 WS 카운트는 DISTINCT(l3Id, functionName) 기준이어야 한다', () => {
      const result = computeCountComparison(mixedFlatItems, stateWithDuplicateB2, []);
      const b2Row = result.find(r => r.itemCode === 'B2');
      expect(b2Row).toBeDefined();
      // WS: l3-1에서 요소기능A가 2번 나오지만 DISTINCT=1, 요소기능B=1 → 2건
      //     l3-2에서 요소기능A=1 → 1건
      //     총 DISTINCT(l3Id, funcName) = 3건
      expect(b2Row!.worksheetCount).toBe(3);  // ★ DISTINCT 기준
    });

  });

  describe('B3 (공정특성) 빈값 제외 + DISTINCT', () => {

    it('B3 Import 카운트는 빈값/공백 제외해야 한다', () => {
      const result = computeCountComparison(mixedFlatItems, stateWithDuplicateB2, []);
      const b3Row = result.find(r => r.itemCode === 'B3');
      expect(b3Row).toBeDefined();
      // 5건 중 빈값('', '  ') 2건 제외 → 3건
      expect(b3Row!.importCount).toBe(3);
    });

  });

  describe('다른 itemCode는 영향 없음', () => {

    it('A2 카운트는 기존 전체 행 수 그대로', () => {
      const result = computeCountComparison(mixedFlatItems, stateWithDuplicateB2, []);
      const a2Row = result.find(r => r.itemCode === 'A2');
      expect(a2Row).toBeDefined();
      expect(a2Row!.importCount).toBe(2);
    });

    it('A5 카운트는 기존 전체 행 수 그대로', () => {
      const result = computeCountComparison(mixedFlatItems, stateWithDuplicateB2, []);
      const a5Row = result.find(r => r.itemCode === 'A5');
      expect(a5Row).toBeDefined();
      expect(a5Row!.importCount).toBe(1);
    });

    it('B4 카운트는 기존 전체 행 수 그대로', () => {
      const result = computeCountComparison(mixedFlatItems, stateWithDuplicateB2, []);
      const b4Row = result.find(r => r.itemCode === 'B4');
      expect(b4Row).toBeDefined();
      expect(b4Row!.importCount).toBe(1);
    });

  });

  describe('엣지케이스', () => {

    it('빈 flatItems → 모든 카운트 0', () => {
      const result = computeCountComparison([], stateWithDuplicateB2, []);
      const b2Row = result.find(r => r.itemCode === 'B2');
      expect(b2Row!.importCount).toBe(0);
    });

    it('B2 중복 없으면 전체 행 수 = DISTINCT 수', () => {
      const noDupItems = [
        { processNo: '10', category: '', itemCode: 'B2', value: '요소기능A' },
        { processNo: '10', category: '', itemCode: 'B2', value: '요소기능B' },
        { processNo: '20', category: '', itemCode: 'B2', value: '요소기능C' },
      ];
      const result = computeCountComparison(noDupItems, stateWithDuplicateB2, []);
      const b2Row = result.find(r => r.itemCode === 'B2');
      expect(b2Row!.importCount).toBe(3);  // 중복 없으므로 전체 행 = DISTINCT
    });

  });

});
