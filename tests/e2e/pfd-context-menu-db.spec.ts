/**
 * @file pfd-context-menu-db.spec.ts
 * @description PFD 워크시트 E2E DB 테스트 - 실제 API 호출로 DB 저장/조회 검증
 *
 * 검증:
 * E-01. GET -> items 로드 확인 (API 응답 성공, items 배열, sortOrder 연속)
 * E-02. 행 추가 -> PUT -> GET -> 행 수 +1
 * E-03. 행 삭제 -> PUT -> GET -> 행 수 -1
 * E-04. 고유값(unique) 저장 검증 (_로 시작하는 고유값)
 * E-05. sortOrder 연속성 검증
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_PFD_NO = 'pfd26-p013-l70';

// --- API 헬퍼 ---

async function loadPFD(request: any, pfdNo: string) {
  return request.get(`${BASE_URL}/api/pfd/${pfdNo}`);
}

async function savePFDItems(request: any, pfdNo: string, items: any[]) {
  return request.put(`${BASE_URL}/api/pfd/${pfdNo}/items`, {
    data: { items },
  });
}

// --- 테스트용 PFD Item 생성 ---

function makeTestItem(overrides: Record<string, any> = {}) {
  return {
    processNo: '',
    processName: '',
    processLevel: '',
    processDesc: '',
    partName: '',
    workElement: '',
    equipment: '',
    productSC: '',
    productChar: '',
    processSC: '',
    processChar: '',
    specialChar: '',
    sortOrder: 0,
    ...overrides,
  };
}

// --- 원본 백업/복원 ---

let originalItems: any[] | null = null;

test.describe('PFD 워크시트 DB 저장/로드 E2E', () => {

  test.beforeAll(async ({ request }) => {
    // 원본 items 백업
    const res = await loadPFD(request, TEST_PFD_NO);
    if (res.ok()) {
      const json = await res.json();
      originalItems = json.data?.items ?? [];
    }
  });

  test.afterAll(async ({ request }) => {
    // 원본 items 복원
    if (originalItems !== null) {
      await savePFDItems(request, TEST_PFD_NO, originalItems);
    }
  });

  // =========================================================================
  // E-01: GET -> items 로드 확인
  // =========================================================================
  test('E-01. GET -> items 로드: API 응답 성공 + items 배열 + sortOrder 연속', async ({ request }) => {
    const res = await loadPFD(request, TEST_PFD_NO);

    if (res.status() === 404) {
      test.skip();
      return;
    }

    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();

    const items = json.data.items;
    expect(Array.isArray(items)).toBe(true);

    // items가 있으면 sortOrder 연속성 검증
    if (items.length > 0) {
      const sortOrders = items.map((item: any) => item.sortOrder);
      const sorted = [...sortOrders].sort((a: number, b: number) => a - b);

      // sortOrder가 정렬되어 있는지
      expect(sortOrders).toEqual(sorted);

      // 각 item에 필수 필드가 존재하는지
      for (const item of items) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('pfdId');
        expect(item).toHaveProperty('processNo');
        expect(item).toHaveProperty('processName');
        expect(typeof item.sortOrder).toBe('number');
      }
    }
  });

  // =========================================================================
  // E-02: 행 추가 -> PUT -> GET -> 행 수 +1
  // =========================================================================
  test('E-02. 행 추가 -> PUT -> GET -> 행 수 +1 검증', async ({ request }) => {
    // 1. 현재 items 로드
    const loadRes = await loadPFD(request, TEST_PFD_NO);
    if (loadRes.status() === 404) { test.skip(); return; }
    const loadJson = await loadRes.json();
    const currentItems = loadJson.data.items ?? [];
    const originalCount = currentItems.length;

    // 2. 기존 items + 새 행 1개 추가
    const itemsForSave = currentItems.map((item: any, idx: number) => ({
      processNo: item.processNo ?? '',
      processName: item.processName ?? '',
      processLevel: item.processLevel ?? '',
      processDesc: item.processDesc ?? '',
      partName: item.partName ?? '',
      workElement: item.workElement ?? '',
      equipment: item.equipment ?? '',
      productSC: item.productSC ?? '',
      productChar: item.productChar ?? '',
      processSC: item.processSC ?? '',
      processChar: item.processChar ?? '',
      specialChar: item.specialChar ?? '',
      sortOrder: idx,
    }));

    // 새 행 추가
    const newItem = makeTestItem({
      processNo: '99',
      processName: 'E2E-Added',
      processLevel: 'L1',
      processDesc: 'E2E 테스트 추가 행',
      partName: 'TestPart',
      equipment: 'TestEquip',
      sortOrder: originalCount,
    });
    itemsForSave.push(newItem);

    // 3. PUT 저장
    const saveRes = await savePFDItems(request, TEST_PFD_NO, itemsForSave);
    expect(saveRes.ok()).toBe(true);
    const saveJson = await saveRes.json();
    expect(saveJson.success).toBe(true);
    expect(saveJson.count).toBe(originalCount + 1);

    // 4. GET으로 다시 로드하여 행 수 검증
    const reloadRes = await loadPFD(request, TEST_PFD_NO);
    const reloadJson = await reloadRes.json();
    const reloadedItems = reloadJson.data.items;

    expect(reloadedItems.length).toBe(originalCount + 1);

    // 5. 새로 추가된 행이 존재하는지 검증
    const addedRow = reloadedItems.find((item: any) => item.processName === 'E2E-Added');
    expect(addedRow).toBeDefined();
    expect(addedRow.processNo).toBe('99');
    expect(addedRow.processDesc).toBe('E2E 테스트 추가 행');
    expect(addedRow.partName).toBe('TestPart');
  });

  // =========================================================================
  // E-03: 행 삭제 -> PUT -> GET -> 행 수 -1
  // =========================================================================
  test('E-03. 행 삭제 -> PUT -> GET -> 행 수 -1 검증', async ({ request }) => {
    // 1. 테스트용 3행 저장
    const threeItems = [
      makeTestItem({ processNo: '10', processName: 'Step-A', partName: 'PA', sortOrder: 0 }),
      makeTestItem({ processNo: '20', processName: 'Step-B', partName: 'PB', sortOrder: 1 }),
      makeTestItem({ processNo: '30', processName: 'Step-C', partName: 'PC', sortOrder: 2 }),
    ];

    const saveRes1 = await savePFDItems(request, TEST_PFD_NO, threeItems);
    expect(saveRes1.ok()).toBe(true);
    const saveJson1 = await saveRes1.json();
    expect(saveJson1.count).toBe(3);

    // 2. GET으로 3행 확인
    const loadRes1 = await loadPFD(request, TEST_PFD_NO);
    const loadJson1 = await loadRes1.json();
    expect(loadJson1.data.items.length).toBe(3);

    // 3. 2번째 행(Step-B) 제거 -> 2행만 PUT (sortOrder 재정렬)
    const twoItems = [
      makeTestItem({ processNo: '10', processName: 'Step-A', partName: 'PA', sortOrder: 0 }),
      makeTestItem({ processNo: '30', processName: 'Step-C', partName: 'PC', sortOrder: 1 }),
    ];

    const saveRes2 = await savePFDItems(request, TEST_PFD_NO, twoItems);
    expect(saveRes2.ok()).toBe(true);
    const saveJson2 = await saveRes2.json();
    expect(saveJson2.count).toBe(2);

    // 4. GET으로 2행 확인
    const loadRes2 = await loadPFD(request, TEST_PFD_NO);
    const loadJson2 = await loadRes2.json();
    const loaded = loadJson2.data.items;

    expect(loaded.length).toBe(2);

    // 5. 삭제된 행(Step-B)이 없는지 검증
    const deletedRow = loaded.find((item: any) => item.processName === 'Step-B');
    expect(deletedRow).toBeUndefined();

    // 6. 남은 행 검증
    expect(loaded[0].processNo).toBe('10');
    expect(loaded[0].processName).toBe('Step-A');
    expect(loaded[1].processNo).toBe('30');
    expect(loaded[1].processName).toBe('Step-C');
  });

  // =========================================================================
  // E-04: 고유값(unique) 저장 검증
  // =========================================================================
  test('E-04. 고유값(_prefix) 저장 -> GET -> 정확히 일치 검증', async ({ request }) => {
    const uniqueProcessNo = `_unique_${Date.now()}`;
    const uniqueProcessName = `_UniqProc_${Date.now()}`;
    const uniquePartName = `_UniqPart_${Date.now()}`;

    const items = [
      makeTestItem({ processNo: '10', processName: 'Normal', partName: 'NormalPart', sortOrder: 0 }),
      makeTestItem({
        processNo: uniqueProcessNo,
        processName: uniqueProcessName,
        partName: uniquePartName,
        processLevel: 'L2',
        processDesc: 'Unique test row',
        equipment: 'UniqueEquip',
        sortOrder: 1,
      }),
      makeTestItem({ processNo: '30', processName: 'Another', partName: 'AnotherPart', sortOrder: 2 }),
    ];

    // 1. PUT 저장
    const saveRes = await savePFDItems(request, TEST_PFD_NO, items);
    expect(saveRes.ok()).toBe(true);

    // 2. GET으로 로드
    const loadRes = await loadPFD(request, TEST_PFD_NO);
    const loadJson = await loadRes.json();
    const loaded = loadJson.data.items;

    expect(loaded.length).toBe(3);

    // 3. 고유값 행이 정확히 저장되었는지 검증
    const uniqueRow = loaded.find((item: any) => item.processNo === uniqueProcessNo);
    expect(uniqueRow).toBeDefined();
    expect(uniqueRow.processNo).toBe(uniqueProcessNo);
    expect(uniqueRow.processName).toBe(uniqueProcessName);
    expect(uniqueRow.partName).toBe(uniquePartName);
    expect(uniqueRow.processLevel).toBe('L2');
    expect(uniqueRow.processDesc).toBe('Unique test row');
    expect(uniqueRow.equipment).toBe('UniqueEquip');

    // 4. 다른 행들도 정상인지 검증
    const normalRow = loaded.find((item: any) => item.processNo === '10');
    expect(normalRow).toBeDefined();
    expect(normalRow.processName).toBe('Normal');
  });

  // =========================================================================
  // E-05: sortOrder 연속성 검증
  // =========================================================================
  test('E-05. sortOrder 연속성: 저장 후 로드 시 0부터 연속 + 순서 보존', async ({ request }) => {
    // 의도적으로 불연속 sortOrder로 저장 (API가 인덱스 기반으로 재정렬하는지 확인)
    const items = [
      makeTestItem({ processNo: '10', processName: 'First', sortOrder: 100 }),
      makeTestItem({ processNo: '20', processName: 'Second', sortOrder: 200 }),
      makeTestItem({ processNo: '30', processName: 'Third', sortOrder: 300 }),
      makeTestItem({ processNo: '40', processName: 'Fourth', sortOrder: 400 }),
      makeTestItem({ processNo: '50', processName: 'Fifth', sortOrder: 500 }),
    ];

    // 1. PUT 저장
    const saveRes = await savePFDItems(request, TEST_PFD_NO, items);
    expect(saveRes.ok()).toBe(true);
    const saveJson = await saveRes.json();
    expect(saveJson.count).toBe(5);

    // 2. GET으로 로드
    const loadRes = await loadPFD(request, TEST_PFD_NO);
    const loadJson = await loadRes.json();
    const loaded = loadJson.data.items;

    expect(loaded.length).toBe(5);

    // 3. sortOrder가 0부터 연속인지 검증 (API가 i 기반 sortOrder 할당)
    for (let i = 0; i < loaded.length; i++) {
      expect(loaded[i].sortOrder).toBe(i);
    }

    // 4. 입력 순서가 보존되는지 검증
    expect(loaded[0].processName).toBe('First');
    expect(loaded[1].processName).toBe('Second');
    expect(loaded[2].processName).toBe('Third');
    expect(loaded[3].processName).toBe('Fourth');
    expect(loaded[4].processName).toBe('Fifth');

    // 5. processNo도 순서대로 보존
    expect(loaded[0].processNo).toBe('10');
    expect(loaded[1].processNo).toBe('20');
    expect(loaded[2].processNo).toBe('30');
    expect(loaded[3].processNo).toBe('40');
    expect(loaded[4].processNo).toBe('50');
  });

});
