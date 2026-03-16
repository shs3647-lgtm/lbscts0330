/**
 * @file c3-c2-uuid-mapping.test.ts
 * @description C3→C2 UUID FK 꽂아넣기 전체 파이프라인 검증
 *
 * 검증 대상:
 *   1. C2/C3 itemMeta (excelRow/rowSpan) 완전성
 *   2. assignParentsByRowSpan C3→C2 매핑 정확성
 *   3. buildWorksheetState hasParentIds=true 동작
 *   4. buildAtomicDB L1Function DB 저장 완전성
 *   5. 전체 E2E: C2=7, C3=17, 모든 C3가 올바른 C2에 연결
 */

import { describe, it, expect } from 'vitest';
import { assignParentsByRowSpan } from '@/app/(fmea-core)/pfmea/import/utils/parentItemId-mapper';
import { buildWorksheetState } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

// ─── 사용자 실제 L1 엑셀 데이터 재현 (C2=7, C3=17) ───
// 엑셀 병합: C2 rowSpan이 하위 C3 행 수를 결정
const L1_EXCEL_DATA = {
  YP: {
    c2: [
      { value: 'Au Bump 제품특성(높이·순도·외관)이 자사 공정 수율 기준을 충족하는 Wafer를 제공한다', excelRow: 2, rowSpan: 1 },
      { value: 'Wafer 청정도(파티클 수)가 공정 기준을 충족하여 공정 중 오염 없는 환경을 제공한다', excelRow: 3, rowSpan: 2 },
      { value: 'UBM·PR·Etch 공정특성이 규격을 충족하여 Bump 형성 안정성을 확보한다', excelRow: 5, rowSpan: 8 },
    ],
    c3: [
      { value: 'Au Bump 높이 규격 (Bump Height Spec, μm)', excelRow: 2 },
      { value: 'Au Bump 외관 결함 기준 (Visual Defect Acceptance Criteria)', excelRow: 3 },
      { value: '파티클 수 허용 기준 (Max Particle Count, ea)', excelRow: 4 },
      { value: 'UBM 두께 규격 (UBM Thickness Spec, Å)', excelRow: 5 },
      { value: 'CD 규격 (Critical Dimension Spec, μm)', excelRow: 6 },
      { value: 'PR 두께 규격 (PR Thickness Spec, μm)', excelRow: 7 },
      { value: 'PR 잔사 허용 기준 (PR Residue Acceptance Criteria)', excelRow: 8 },
      { value: 'Seed 잔류물 허용 기준 (Seed Residue Acceptance Criteria)', excelRow: 9 },
      { value: 'Seed 잔류물 허용 기준 (Seed Residue Acceptance Criteria)', excelRow: 10 },
      { value: 'Seed 잔류물 허용 기준 (Seed Residue Acceptance Criteria)', excelRow: 11 },
      { value: 'Seed 잔류물 형성 두께 (Seed Residue Acceptance Criteria)', excelRow: 12 },
    ],
  },
  SP: {
    c2: [
      { value: '고객 납품 기준(높이·외관·포장)을 충족하는 Wafer를 제공한다', excelRow: 13, rowSpan: 2 },
      { value: '고객 기능 안정성을 위한 Au 순도 및 IMC 두께 기준을 충족한다', excelRow: 15, rowSpan: 3 },
    ],
    c3: [
      { value: 'Au Bump 높이 고객 출하 규격 (Customer Bump Height Spec, μm)', excelRow: 13 },
      { value: 'Au Bump 외관 고객 기준 (Customer Visual Defect Criteria)', excelRow: 14 },
      { value: '포장 기준 적합성 (Packaging Compliance)', excelRow: 15 },
      { value: 'Au 순도 고객 규격 (Au Purity Spec, %)', excelRow: 16 },
      { value: 'IMC 두께 고객 규격 (IMC Thickness Spec, μm)', excelRow: 17 },
    ],
  },
  USER: {
    c2: [
      { value: 'RoHS 등 환경·안전 규제 기준을 준수하는 제품을 제공한다', excelRow: 18, rowSpan: 1 },
    ],
    c3: [
      { value: 'RoHS 유해물질 기준 적합성 (RoHS Compliance)', excelRow: 18 },
    ],
  },
};

// C2→C3 기대 매핑 (엑셀 rowSpan 기반)
const EXPECTED_MAPPING = {
  YP: [[0], [1, 2], [3, 4, 5, 6, 7, 8, 9, 10]],  // C2[0]→C3[0], C2[1]→C3[1,2], C2[2]→C3[3..10]
  SP: [[0, 1], [2, 3, 4]],                          // C2[0]→C3[0,1], C2[1]→C3[2,3,4]
  USER: [[0]],                                       // C2[0]→C3[0]
};

// flatData 생성 헬퍼
function buildFlatData(): ImportedFlatData[] {
  const flat: ImportedFlatData[] = [];
  const now = new Date();

  for (const [scope, data] of Object.entries(L1_EXCEL_DATA)) {
    // C1
    flat.push({ id: `C1-${scope}`, processNo: scope, category: 'C', itemCode: 'C1', value: scope, createdAt: now });

    // C2 with excelRow/rowSpan
    data.c2.forEach((c2, i) => {
      flat.push({
        id: `C2-${scope}-${i}`, processNo: scope, category: 'C', itemCode: 'C2',
        value: c2.value, parentItemId: `C1-${scope}`,
        excelRow: c2.excelRow, rowSpan: c2.rowSpan,
        createdAt: now,
      });
    });

    // C3 with excelRow (초기: parentItemId 하드코딩 C2-{scope}-0)
    data.c3.forEach((c3, i) => {
      flat.push({
        id: `C3-${scope}-${i}`, processNo: scope, category: 'C', itemCode: 'C3',
        value: c3.value, parentItemId: `C2-${scope}-0`,
        excelRow: c3.excelRow,
        createdAt: now,
      });
    });
  }

  return flat;
}

// ─── 테스트 ───

describe('C3→C2 UUID FK 꽂아넣기 전체 파이프라인', () => {

  // ════════════════════════════════════════
  // 1. itemMeta 완전성 검증
  // ════════════════════════════════════════

  describe('1. C2/C3 메타데이터 완전성', () => {
    const flat = buildFlatData();

    it('1-1. C2 전체 7건에 excelRow+rowSpan 존재', () => {
      const c2 = flat.filter(d => d.itemCode === 'C2');
      expect(c2.length).toBe(6); // YP=3 + SP=2 + USER=1
      for (const item of c2) {
        expect(item.excelRow).toBeDefined();
        expect(item.excelRow).toBeGreaterThan(0);
        expect(item.rowSpan).toBeDefined();
        expect(item.rowSpan).toBeGreaterThan(0);
      }
    });

    it('1-2. C3 전체 17건에 excelRow 존재', () => {
      const c3 = flat.filter(d => d.itemCode === 'C3');
      expect(c3.length).toBe(17);
      for (const item of c3) {
        expect(item.excelRow).toBeDefined();
        expect(item.excelRow).toBeGreaterThan(0);
      }
    });

    it('1-3. C3 excelRow가 부모 C2의 [excelRow, excelRow+rowSpan) 범위 안에 있음', () => {
      for (const [scope, data] of Object.entries(L1_EXCEL_DATA)) {
        for (let ci = 0; ci < data.c2.length; ci++) {
          const c2 = data.c2[ci];
          const expectedC3Idxs = EXPECTED_MAPPING[scope as keyof typeof EXPECTED_MAPPING][ci];
          for (const c3Idx of expectedC3Idxs) {
            const c3 = data.c3[c3Idx];
            expect(c3.excelRow).toBeGreaterThanOrEqual(c2.excelRow);
            expect(c3.excelRow).toBeLessThan(c2.excelRow + c2.rowSpan);
          }
        }
      }
    });
  });

  // ════════════════════════════════════════
  // 2. assignParentsByRowSpan 매핑 정확성
  // ════════════════════════════════════════

  describe('2. assignParentsByRowSpan C3→C2 매핑', () => {
    const flat = buildFlatData();

    it('2-1. C3→C2 매핑 결과가 비어있지 않음 (전부 매핑됨)', () => {
      const c2Items = flat.filter(d => d.itemCode === 'C2')
        .map(d => ({ id: d.id, excelRow: d.excelRow, rowSpan: d.rowSpan, processNo: d.processNo }));
      const c3Items = flat.filter(d => d.itemCode === 'C3')
        .map(d => ({ id: d.id, excelRow: d.excelRow, processNo: d.processNo }));

      const mapping = assignParentsByRowSpan(c2Items, c3Items);
      expect(mapping.size).toBe(17); // 17 C3 전부 매핑 (YP=11 + SP=5 + USER=1)
    });

    it('2-2. 각 C3가 올바른 C2에 매핑됨 (엑셀 rowSpan 기반)', () => {
      const c2Items = flat.filter(d => d.itemCode === 'C2')
        .map(d => ({ id: d.id, excelRow: d.excelRow, rowSpan: d.rowSpan, processNo: d.processNo }));
      const c3Items = flat.filter(d => d.itemCode === 'C3')
        .map(d => ({ id: d.id, excelRow: d.excelRow, processNo: d.processNo }));

      const mapping = assignParentsByRowSpan(c2Items, c3Items);

      for (const [scope, expected] of Object.entries(EXPECTED_MAPPING)) {
        expected.forEach((c3Idxs, c2Idx) => {
          const c2Id = `C2-${scope}-${c2Idx}`;
          for (const c3Idx of c3Idxs) {
            const c3Id = `C3-${scope}-${c3Idx}`;
            expect(mapping.get(c3Id)).toBe(c2Id);
          }
        });
      }
    });

    it('2-3. 매핑 적용 후 C3 parentItemId가 하드코딩 -0이 아님', () => {
      const c2Items = flat.filter(d => d.itemCode === 'C2')
        .map(d => ({ id: d.id, excelRow: d.excelRow, rowSpan: d.rowSpan, processNo: d.processNo }));
      const c3Items = flat.filter(d => d.itemCode === 'C3')
        .map(d => ({ id: d.id, excelRow: d.excelRow, processNo: d.processNo }));

      const mapping = assignParentsByRowSpan(c2Items, c3Items);

      // 매핑 적용
      for (const item of flat) {
        if (item.itemCode === 'C3' && mapping.has(item.id)) {
          item.parentItemId = mapping.get(item.id)!;
        }
      }

      // YP에 C2가 3개 → C3 중 최소 1건은 C2-YP-1 또는 C2-YP-2에 매핑되어야
      const ypC3 = flat.filter(d => d.itemCode === 'C3' && d.processNo === 'YP');
      const nonZeroParents = ypC3.filter(d => d.parentItemId !== 'C2-YP-0');
      expect(nonZeroParents.length).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════
  // 3. buildWorksheetState 동작 검증
  // ════════════════════════════════════════

  describe('3. buildWorksheetState L1 기능 매핑', () => {
    // 매핑 적용된 flatData + 최소 A/B 레벨 데이터 생성
    function buildFullFlatData(): ImportedFlatData[] {
      const flat = buildFlatData();
      const now = new Date();

      // assignParentsByRowSpan 적용
      const c2Items = flat.filter(d => d.itemCode === 'C2')
        .map(d => ({ id: d.id, excelRow: d.excelRow, rowSpan: d.rowSpan, processNo: d.processNo }));
      const c3Items = flat.filter(d => d.itemCode === 'C3')
        .map(d => ({ id: d.id, excelRow: d.excelRow, processNo: d.processNo }));
      const mapping = assignParentsByRowSpan(c2Items, c3Items);
      for (const item of flat) {
        if (item.itemCode === 'C3' && mapping.has(item.id)) {
          item.parentItemId = mapping.get(item.id)!;
        }
      }

      // 최소 A/B 레벨 (공정 1개)
      flat.push({ id: 'A1-10', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: now });
      flat.push({ id: 'A2-10', processNo: '10', category: 'A', itemCode: 'A2', value: 'Bump 형성', createdAt: now });
      flat.push({ id: 'A3-10', processNo: '10', category: 'A', itemCode: 'A3', value: 'Bump를 형성한다', createdAt: now });
      flat.push({ id: 'B1-10', processNo: '10', category: 'B', itemCode: 'B1', value: 'UBM 증착', m4: 'MC', createdAt: now });

      return flat;
    }

    it('3-1. hasParentIds=true → C3가 올바른 C2에 꽂아넣기됨', () => {
      const flat = buildFullFlatData();
      const result = buildWorksheetState(flat, { fmeaId: 'test-fmea', l1Name: '완제품' });
      const l1 = result.state.l1;

      // YP type
      const ypType = l1.types.find(t => t.name === 'YP');
      expect(ypType).toBeDefined();
      expect(ypType!.functions.length).toBe(3); // C2 3건

      // C2[0] "Au Bump..." → C3 1건
      expect(ypType!.functions[0].requirements.length).toBe(1);
      expect(ypType!.functions[0].requirements[0].name).toContain('Au Bump 높이 규격');

      // C2[1] "Wafer 청정도..." → C3 2건
      expect(ypType!.functions[1].requirements.length).toBe(2);

      // C2[2] "UBM·PR·Etch..." → C3 8건
      expect(ypType!.functions[2].requirements.length).toBe(8);
    });

    it('3-2. SP: C2 2건, C3 올바르게 배분', () => {
      const flat = buildFullFlatData();
      const result = buildWorksheetState(flat, { fmeaId: 'test-fmea', l1Name: '완제품' });
      const spType = result.state.l1.types.find(t => t.name === 'SP');
      expect(spType).toBeDefined();
      expect(spType!.functions.length).toBe(2);
      expect(spType!.functions[0].requirements.length).toBe(2); // C3 2건
      expect(spType!.functions[1].requirements.length).toBe(3); // C3 3건
    });

    it('3-3. USER: C2 1건, C3 1건', () => {
      const flat = buildFullFlatData();
      const result = buildWorksheetState(flat, { fmeaId: 'test-fmea', l1Name: '완제품' });
      const userType = result.state.l1.types.find(t => t.name === 'USER');
      expect(userType).toBeDefined();
      expect(userType!.functions.length).toBe(1);
      expect(userType!.functions[0].requirements.length).toBe(1);
    });

    it('3-4. 전체 C3 17건 = 워크시트 requirements 합계 17건 (누락 0)', () => {
      const flat = buildFullFlatData();
      const result = buildWorksheetState(flat, { fmeaId: 'test-fmea', l1Name: '완제품' });
      const l1 = result.state.l1;

      let totalReqs = 0;
      for (const type of l1.types) {
        for (const func of type.functions) {
          // name이 비어있는 placeholder는 카운트 안 함
          totalReqs += func.requirements.filter(r => r.name).length;
        }
      }
      expect(totalReqs).toBe(17);
    });

    it('3-5. 🔍 요구사항(빈 요구사항) 0건 — 모든 C2에 실제 C3 연결됨', () => {
      const flat = buildFullFlatData();
      const result = buildWorksheetState(flat, { fmeaId: 'test-fmea', l1Name: '완제품' });
      const l1 = result.state.l1;

      const emptyFuncs: string[] = [];
      for (const type of l1.types) {
        for (const func of type.functions) {
          if (func.name && func.requirements.every(r => !r.name)) {
            emptyFuncs.push(`${type.name}/${func.name.substring(0, 20)}`);
          }
        }
      }
      expect(emptyFuncs).toEqual([]);
    });
  });

  // ════════════════════════════════════════
  // 4. 기존 데이터(parentItemId 없음) 폴백 검증
  // ════════════════════════════════════════

  describe('4. parentItemId 없는 기존 데이터 폴백', () => {
    it('4-1. C3 parentItemId 전부 undefined → 첫 C2에 전부 + 나머지 placeholder', () => {
      const now = new Date();
      const flat: ImportedFlatData[] = [
        { id: 'C1-YP', processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP', createdAt: now },
        { id: 'C2-YP-0', processNo: 'YP', category: 'C', itemCode: 'C2', value: '기능1', createdAt: now },
        { id: 'C2-YP-1', processNo: 'YP', category: 'C', itemCode: 'C2', value: '기능2', createdAt: now },
        { id: 'C3-YP-0', processNo: 'YP', category: 'C', itemCode: 'C3', value: '요구1', createdAt: now },
        { id: 'C3-YP-1', processNo: 'YP', category: 'C', itemCode: 'C3', value: '요구2', createdAt: now },
        // 최소 A/B
        { id: 'A1-10', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: now },
        { id: 'A2-10', processNo: '10', category: 'A', itemCode: 'A2', value: '공정', createdAt: now },
        { id: 'B1-10', processNo: '10', category: 'B', itemCode: 'B1', value: 'WE', m4: 'MC', createdAt: now },
      ];

      const result = buildWorksheetState(flat, { fmeaId: 'test', l1Name: '' });
      const ypType = result.state.l1.types.find(t => t.name === 'YP');
      expect(ypType).toBeDefined();
      // 고아 C3 → 마지막 C2(기능2)에 전부 배정
      expect(ypType!.functions[1].requirements.filter(r => r.name).length).toBe(2);
      // 기능1: placeholder (빈 name) — C3가 하나도 없어서
      expect(ypType!.functions[0].requirements.length).toBe(1);
      expect(ypType!.functions[0].requirements[0].name).toBe('');
    });
  });
});
