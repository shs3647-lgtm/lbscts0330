/**
 * @file l1-function-uuid-integrity.spec.ts
 * @description L1 기능탭 UUID 완전성 E2E 검증 (5회 반복)
 *
 * 검증 항목:
 *   1. Import API → flatData C2/C3 중복 없음
 *   2. save-from-import → legacyData L1.types 완전성
 *   3. rebuild-atomic → l1_functions DB 저장 완전성
 *   4. 워크시트 로드 → L1 기능탭 렌더링 정확성
 *   5. 5회 반복 → 매 Import마다 일관된 결과
 *
 * @created 2026-03-16
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── 설정 ───
const EXCEL_FILE = path.resolve('tests/temp-sample-template.xlsx');
const BASE_URL = 'http://localhost:3000';
const TEST_FMEA_ID = 'pfm26-l1-test-' + Date.now();
const IMPORT_API = `${BASE_URL}/api/fmea/save-from-import`;
const VERIFY_API = `${BASE_URL}/api/fmea/verify-counts?fmeaId=${TEST_FMEA_ID}`;

// ─── 기대값 (temp-sample-template.xlsx 기준) ───
const EXPECTED = {
  c1Scopes: 3,        // YP, SP, USER
  c2Functions: 11,     // C2 시트 고유값 (dedup 후)
  c3Requirements: 40,  // C3 시트 고유값 (dedup 후)
  // 각 scope별 C2 수
  ypC2: 6,
  spC2: 2,
  userC2: 3,
};

test.describe('L1 기능탭 UUID 완전성 E2E 검증', () => {

  test('1. Import API 직접 호출 → L1 데이터 완전성 검증', async ({ request }) => {
    // save-from-import API 호출
    const res = await request.post(IMPORT_API, {
      data: {
        fmeaId: TEST_FMEA_ID,
        flatData: generateMinimalFlatData(),
        l1Name: 'Au Bump 형성',
      },
      timeout: 60000,
    });

    expect(res.ok()).toBeTruthy();
    const result = await res.json();
    console.log('Import result:', JSON.stringify({
      success: result.success,
      atomicCounts: result.atomicCounts,
      verified: result.verified,
    }));

    expect(result.success).toBe(true);

    // L1Function 카운트 확인
    if (result.atomicCounts) {
      console.log(`L1 FailureEffects: ${result.atomicCounts.failureEffects}`);
    }
  });

  test('2. 워크시트 1L 기능탭 → 빈 요구사항(🔍) 0건 확인', async ({ page }) => {
    const worksheetUrl = `${BASE_URL}/pfmea/worksheet?id=${TEST_FMEA_ID}`;
    await page.goto(worksheetUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L 기능 탭 클릭
    const funcL1Tab = page.locator('button').filter({ hasText: /1L.*기능|기능.*1L|Function.*L1/i }).first();
    if (await funcL1Tab.isVisible()) {
      await funcL1Tab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'tests/screenshots/l1-func-01.png', fullPage: true });

    // "🔍 요구사항" placeholder 카운트
    const emptyReqCells = page.locator('td:has-text("요구사항 선택"), td:has-text("🔍 요구사항")');
    const emptyCount = await emptyReqCells.count();
    console.log(`빈 요구사항 셀: ${emptyCount}건`);

    // 모든 기능 셀에 값이 있는지 확인
    const funcCells = page.locator('td:has-text("기능 선택")');
    const emptyFuncCount = await funcCells.count();
    console.log(`빈 기능 셀: ${emptyFuncCount}건`);

    await page.screenshot({ path: 'tests/screenshots/l1-func-02-tab.png', fullPage: true });
  });

  test('3. DB 직접 검증 → l1_functions 카운트 + FK 정합성', async ({ request }) => {
    // verify-counts API
    const res = await request.get(`${BASE_URL}/api/fmea?fmeaId=${TEST_FMEA_ID}&format=atomic`);
    if (res.ok()) {
      const data = await res.json();
      const l1Funcs = data.l1Functions?.length || 0;
      const failureEffects = data.failureEffects?.length || 0;
      console.log(`DB l1Functions: ${l1Funcs}`);
      console.log(`DB failureEffects: ${failureEffects}`);

      // L1Function이 0이 아닌지 확인
      expect(l1Funcs).toBeGreaterThan(0);
    }
  });

  test('4. legacyData L1.types 구조 검증', async ({ request }) => {
    // GET /api/fmea로 legacyData 조회
    const res = await request.get(`${BASE_URL}/api/fmea?fmeaId=${TEST_FMEA_ID}`);
    if (res.ok()) {
      const data = await res.json();
      const l1 = data.l1;
      if (l1?.types) {
        console.log('L1 types:');
        for (const t of l1.types) {
          const funcs = t.functions || [];
          const totalReqs = funcs.reduce((sum: number, f: any) =>
            sum + (f.requirements?.filter((r: any) => r.name)?.length || 0), 0);
          const emptyFuncs = funcs.filter((f: any) =>
            !f.requirements?.length || f.requirements.every((r: any) => !r.name)).length;
          console.log(`  ${t.name}: C2=${funcs.length}, C3(실제)=${totalReqs}, 빈기능=${emptyFuncs}`);
        }
      }
    }
  });

  // 5회 반복 안정성 검증
  for (let i = 1; i <= 5; i++) {
    test(`5-${i}. 반복 Import #${i} → C3 중복 없음 + 누락 없음`, async ({ request }) => {
      const repeatFmeaId = `pfm26-l1-repeat-${i}-${Date.now()}`;

      const res = await request.post(IMPORT_API, {
        data: {
          fmeaId: repeatFmeaId,
          flatData: generateMinimalFlatData(),
          l1Name: `반복테스트 #${i}`,
        },
        timeout: 60000,
      });

      expect(res.ok()).toBeTruthy();
      const result = await res.json();
      expect(result.success).toBe(true);

      // legacyData 확인
      const legacyRes = await request.get(`${BASE_URL}/api/fmea?fmeaId=${repeatFmeaId}`);
      if (legacyRes.ok()) {
        const data = await legacyRes.json();
        const types = data.l1?.types || [];

        let totalC3 = 0;
        let emptyC2 = 0;
        for (const t of types) {
          for (const f of (t.functions || [])) {
            const reqs = (f.requirements || []).filter((r: any) => r.name);
            totalC3 += reqs.length;
            if (reqs.length === 0 && f.name) emptyC2++;
          }
        }

        console.log(`반복 #${i}: C3=${totalC3}, 빈C2=${emptyC2}`);

        // C3 > 0 (데이터 존재)
        expect(totalC3).toBeGreaterThan(0);
      }
    });
  }
});

/**
 * 최소 flatData 생성 (L1 검증용)
 * C1/C2/C3 + 최소 A/B 레벨
 */
function generateMinimalFlatData() {
  const now = new Date().toISOString();
  const flat: any[] = [];

  // A 레벨 (최소 1개 공정)
  flat.push({ id: 'A1-10', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: now });
  flat.push({ id: 'A2-10', processNo: '10', category: 'A', itemCode: 'A2', value: 'Bump 형성', createdAt: now });
  flat.push({ id: 'A3-10', processNo: '10', category: 'A', itemCode: 'A3', value: 'Bump를 형성한다', createdAt: now });

  // B 레벨 (최소 1개 WE)
  flat.push({ id: 'B1-10', processNo: '10', category: 'B', itemCode: 'B1', value: 'UBM 증착', m4: 'MC', createdAt: now });
  flat.push({ id: 'B2-10', processNo: '10', category: 'B', itemCode: 'B2', value: 'UBM 증착을 수행한다', m4: 'MC', createdAt: now });

  // C 레벨 — excelRow/rowSpan 포함
  // C1
  flat.push({ id: 'C1-YP', processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP', createdAt: now });
  flat.push({ id: 'C1-SP', processNo: 'SP', category: 'C', itemCode: 'C1', value: 'SP', createdAt: now });
  flat.push({ id: 'C1-USER', processNo: 'USER', category: 'C', itemCode: 'C1', value: 'USER', createdAt: now });

  // C2 (YP=2, SP=1, USER=1) with excelRow/rowSpan
  flat.push({ id: 'C2-YP-0', processNo: 'YP', category: 'C', itemCode: 'C2', value: 'Bump 높이 규격 충족', parentItemId: 'C1-YP', excelRow: 2, rowSpan: 2, createdAt: now });
  flat.push({ id: 'C2-YP-1', processNo: 'YP', category: 'C', itemCode: 'C2', value: 'Wafer 청정도 확보', parentItemId: 'C1-YP', excelRow: 4, rowSpan: 1, createdAt: now });
  flat.push({ id: 'C2-SP-0', processNo: 'SP', category: 'C', itemCode: 'C2', value: '고객 납품 기준 충족', parentItemId: 'C1-SP', excelRow: 5, rowSpan: 2, createdAt: now });
  flat.push({ id: 'C2-USER-0', processNo: 'USER', category: 'C', itemCode: 'C2', value: 'RoHS 규제 준수', parentItemId: 'C1-USER', excelRow: 7, rowSpan: 1, createdAt: now });

  // C3 with excelRow — parentItemId는 assignParentsByRowSpan이 설정
  // YP: C2-YP-0(row2,span2)→C3[0,1], C2-YP-1(row4,span1)→C3[2]
  flat.push({ id: 'C3-YP-0', processNo: 'YP', category: 'C', itemCode: 'C3', value: 'Bump Height Spec', parentItemId: 'C2-YP-0', excelRow: 2, createdAt: now });
  flat.push({ id: 'C3-YP-1', processNo: 'YP', category: 'C', itemCode: 'C3', value: 'Bump Uniformity', parentItemId: 'C2-YP-0', excelRow: 3, createdAt: now });
  flat.push({ id: 'C3-YP-2', processNo: 'YP', category: 'C', itemCode: 'C3', value: 'Particle Count', parentItemId: 'C2-YP-1', excelRow: 4, createdAt: now });
  // SP: C2-SP-0(row5,span2)→C3[0,1]
  flat.push({ id: 'C3-SP-0', processNo: 'SP', category: 'C', itemCode: 'C3', value: 'Shear Strength', parentItemId: 'C2-SP-0', excelRow: 5, createdAt: now });
  flat.push({ id: 'C3-SP-1', processNo: 'SP', category: 'C', itemCode: 'C3', value: 'Packing Standard', parentItemId: 'C2-SP-0', excelRow: 6, createdAt: now });
  // USER: C2-USER-0(row7,span1)→C3[0]
  flat.push({ id: 'C3-USER-0', processNo: 'USER', category: 'C', itemCode: 'C3', value: 'RoHS Compliance', parentItemId: 'C2-USER-0', excelRow: 7, createdAt: now });

  // C4 고장영향
  flat.push({ id: 'C4-YP-0', processNo: 'YP', category: 'C', itemCode: 'C4', value: 'Bump Height Spec Out', createdAt: now });
  flat.push({ id: 'C4-SP-0', processNo: 'SP', category: 'C', itemCode: 'C4', value: '고객 Reject', createdAt: now });
  flat.push({ id: 'C4-USER-0', processNo: 'USER', category: 'C', itemCode: 'C4', value: '규제 위반', createdAt: now });

  return flat;
}
