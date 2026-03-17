/**
 * @file orphan-pc-placeholder-fc.spec.ts
 * @description TDD — FC가 없는 orphan processChar에 placeholder FC 자동 생성 검증
 *
 * 근본원인: 엑셀에 B4(FC)가 processChar보다 적으면,
 * 남은 processChar가 FC 없이 "🔍 고장원인 선택"으로 표시됨.
 * 수정: B4 배분 후 남은 processChar에 placeholder FC를 자동 생성.
 */

import { buildWorksheetState } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

function flat(override: Partial<ImportedFlatData>): ImportedFlatData {
  return {
    id: override.id || `test-${Math.random().toString(36).slice(2, 8)}`,
    processNo: override.processNo || '10',
    category: override.category || 'B',
    itemCode: override.itemCode || 'B1',
    value: override.value || '',
    m4: override.m4,
    parentItemId: override.parentItemId,
    createdAt: new Date(),
    ...override,
  } as ImportedFlatData;
}

describe('orphan processChar placeholder FC 자동 생성', () => {
  it('B4가 processChar보다 적을 때 orphan PC에 placeholder FC가 생성되어야 함', () => {
    // 공정10: MC WE 1개, processChar 2개, B4(FC) 1개
    // → 첫 PC에만 FC가 매칭됨 → 두 번째 PC가 orphan → placeholder FC 필요
    const flatData: ImportedFlatData[] = [
      // A1: 공정명
      flat({ processNo: '10', category: 'A', itemCode: 'A1', value: 'IQA(수입검사)' }),
      // A2: 공정번호
      flat({ processNo: '10', category: 'A', itemCode: 'A2', value: '10' }),
      // B1: 작업요소 1 (MC)
      flat({ id: 'b1-mc1', processNo: '10', category: 'B', itemCode: 'B1', value: '두께 측정기', m4: 'MC' }),
      // B1: 작업요소 2 (MC) — 같은 m4, 두 번째 WE
      flat({ id: 'b1-mc2', processNo: '10', category: 'B', itemCode: 'B1', value: 'HIGH POWER SCOPE', m4: 'MC' }),
      // B3: 첫 WE의 processChar
      flat({ id: 'b3-pc1', processNo: '10', category: 'B', itemCode: 'B3', value: '측정 정밀도', m4: 'MC', parentItemId: 'b1-mc1' }),
      // B3: 두 번째 WE의 processChar
      flat({ id: 'b3-pc2', processNo: '10', category: 'B', itemCode: 'B3', value: '광학 해상도', m4: 'MC', parentItemId: 'b1-mc2' }),
      // B4: FC 1건만 (첫 PC에 매칭됨, 두 번째 PC는 orphan)
      flat({ id: 'b4-fc1', processNo: '10', category: 'B', itemCode: 'B4', value: '측정 오차', m4: 'MC', parentItemId: 'b3-pc1' }),
      // C1: L1 구분
      flat({ processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP' }),
    ];

    const result = buildWorksheetState(flatData, { fmeaId: 'test-fmea' });
    expect(result.success).toBe(true);

    const proc = result.state.l2?.find((p: any) => p.no === '10');
    expect(proc).toBeDefined();

    const fcs = proc?.failureCauses || [];
    console.log(`FC 수: ${fcs.length}`);
    fcs.forEach((fc: any) => {
      console.log(`  FC="${fc.name}" processCharId=${fc.processCharId}`);
    });

    // 2개의 processChar 각각에 FC가 있어야 함
    // PC1: 측정 정밀도 → FC "측정 오차" (원본 B4)
    // PC2: 광학 해상도 → FC placeholder (자동 생성)
    expect(fcs.length).toBeGreaterThanOrEqual(2);

    // 모든 processChar에 FC가 연결되어야 함
    const allProcessCharIds = new Set<string>();
    for (const we of (proc?.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (pc.name && pc.name.trim() !== '') {
            allProcessCharIds.add(pc.id);
          }
        }
      }
    }
    console.log(`processChar IDs: ${[...allProcessCharIds].join(', ')}`);

    const fcProcessCharIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
    console.log(`FC processCharIds: ${[...fcProcessCharIds].join(', ')}`);

    // 핵심 검증: 모든 processChar에 최소 1개의 FC가 있어야 함
    for (const pcId of allProcessCharIds) {
      const hasFC = fcs.some((fc: any) => fc.processCharId === pcId);
      expect(hasFC).toBe(true);
    }
  });

  it('같은 WE 안에 processChar 2개, B4 1개일 때 두 번째 PC에도 FC가 생성되어야 함', () => {
    // 공정01: MC WE 1개 (항온항습기), processChar 2개 (온도, 습도), B4 1개
    const flatData: ImportedFlatData[] = [
      flat({ processNo: '01', category: 'A', itemCode: 'A1', value: '작업환경' }),
      flat({ processNo: '01', category: 'A', itemCode: 'A2', value: '01' }),
      // B1: 항온항습기
      flat({ id: 'b1-mc1', processNo: '01', category: 'B', itemCode: 'B1', value: '항온항습기', m4: 'MC' }),
      // B3: 온도 (첫 번째)
      flat({ id: 'b3-temp', processNo: '01', category: 'B', itemCode: 'B3', value: '온도(Temperature, ℃)', m4: 'MC', parentItemId: 'b1-mc1' }),
      // B3: 습도 (두 번째)
      flat({ id: 'b3-humid', processNo: '01', category: 'B', itemCode: 'B3', value: '습도(Humidity, %RH)', m4: 'MC', parentItemId: 'b1-mc1' }),
      // B4: FC 1건만 (온도에 매칭, 습도는 orphan)
      flat({ id: 'b4-fc1', processNo: '01', category: 'B', itemCode: 'B4', value: '설비 가동률 저하', m4: 'MC', parentItemId: 'b3-temp' }),
      flat({ processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP' }),
    ];

    const result = buildWorksheetState(flatData, { fmeaId: 'test-fmea-2' });
    expect(result.success).toBe(true);

    const proc = result.state.l2?.find((p: any) => p.no === '01');
    expect(proc).toBeDefined();

    const fcs = proc?.failureCauses || [];

    // processChar "습도" 에 FC가 있어야 함
    const allPcIds = new Set<string>();
    for (const we of (proc?.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (pc.name) allPcIds.add(pc.id);
        }
      }
    }

    for (const pcId of allPcIds) {
      const hasFC = fcs.some((fc: any) => fc.processCharId === pcId);
      if (!hasFC) {
        console.log(`❌ processChar ${pcId} 에 FC 없음`);
      }
      expect(hasFC).toBe(true);
    }
  });

  it('모든 processChar에 이미 FC가 있으면 placeholder를 생성하지 않아야 함', () => {
    // B4 2개, processChar 2개 → 모두 매칭 → placeholder 불필요
    const flatData: ImportedFlatData[] = [
      flat({ processNo: '20', category: 'A', itemCode: 'A1', value: 'Sorter' }),
      flat({ processNo: '20', category: 'A', itemCode: 'A2', value: '20' }),
      flat({ id: 'b1-mc1', processNo: '20', category: 'B', itemCode: 'B1', value: 'Sorter 장비', m4: 'MC' }),
      flat({ id: 'b3-pc1', processNo: '20', category: 'B', itemCode: 'B3', value: 'PC1', m4: 'MC', parentItemId: 'b1-mc1' }),
      flat({ id: 'b3-pc2', processNo: '20', category: 'B', itemCode: 'B3', value: 'PC2', m4: 'MC', parentItemId: 'b1-mc1' }),
      flat({ id: 'b4-fc1', processNo: '20', category: 'B', itemCode: 'B4', value: 'FC1', m4: 'MC', parentItemId: 'b3-pc1' }),
      flat({ id: 'b4-fc2', processNo: '20', category: 'B', itemCode: 'B4', value: 'FC2', m4: 'MC', parentItemId: 'b3-pc2' }),
      flat({ processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP' }),
    ];

    const result = buildWorksheetState(flatData, { fmeaId: 'test-fmea-3' });
    expect(result.success).toBe(true);

    const proc = result.state.l2?.find((p: any) => p.no === '20');
    const fcs = proc?.failureCauses || [];

    // 정확히 2개 (placeholder 없음)
    const realFcs = fcs.filter((fc: any) => !fc.name?.includes('부적합'));
    expect(realFcs.length).toBe(2);
  });
});
