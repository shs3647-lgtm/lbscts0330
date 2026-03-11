/**
 * @file cp-context-menu-db.spec.ts
 * @description CP 컨텍스트 메뉴 행 삽입 후 DB 저장/로드 라운드트립 E2E 테스트
 *
 * 검증:
 * 1. CP items PUT → GET 라운드트립 데이터 정합성
 * 2. part 타입 insertAbove 결과 DB 저장 → 로드 후 sortOrder/partName 검증
 * 3. part 타입 insertBelow 결과 DB 저장 → 로드 후 검증
 * 4. general 타입 행 삽입 결과 DB 저장 → 로드 후 검증
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
// 실제 DB에 존재하는 CP 번호 사용
const TEST_CP_NO = 'cp26-p013-l70';

// CP API 헬퍼
async function saveCPItems(request: any, cpNo: string, items: any[]) {
  const res = await request.put(`${BASE_URL}/api/control-plan/${cpNo}/items`, {
    data: { items },
  });
  return res;
}

async function loadCPItems(request: any, cpNo: string) {
  const res = await request.get(`${BASE_URL}/api/control-plan/${cpNo}/items`);
  return res;
}

// 테스트용 CP Item 생성
function makeTestItem(overrides: Record<string, any>) {
  return {
    processNo: '',
    processName: '',
    processLevel: '',
    processDesc: '',
    partName: '',
    equipment: '',
    productChar: '',
    processChar: '',
    specialChar: '',
    specTolerance: '',
    evalMethod: '',
    sampleSize: '',
    sampleFreq: '',
    controlMethod: '',
    owner1: '',
    owner2: '',
    reactionPlan: '',
    sortOrder: 0,
    ...overrides,
  };
}

test.describe('CP 컨텍스트 메뉴 DB 저장/로드 E2E', () => {

  test('1. CP Items PUT→GET 라운드트립: 기본 데이터 정합성', async ({ request }) => {
    // 먼저 기존 CP가 있는지 확인
    const checkRes = await loadCPItems(request, TEST_CP_NO);

    // CP가 없으면 이 테스트는 스킵 (CP 생성은 register 페이지에서만 가능)
    if (checkRes.status() === 404) {
      test.skip();
      return;
    }

    const items = [
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: 'PartA', equipment: 'Press-01', sortOrder: 0 }),
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: 'PartA', equipment: 'Press-01', sortOrder: 1 }),
      makeTestItem({ processNo: '20', processName: 'Weld', processLevel: 'L2', processDesc: 'Welding', partName: 'PartB', equipment: 'Welder-01', sortOrder: 2 }),
    ];

    const saveRes = await saveCPItems(request, TEST_CP_NO, items);

    if (saveRes.status() === 404) {
      test.skip();
      return;
    }

    expect(saveRes.ok()).toBe(true);
    const saveData = await saveRes.json();
    expect(saveData.success).toBe(true);
    expect(saveData.count).toBe(3);

    // GET으로 다시 로드
    const loadRes = await loadCPItems(request, TEST_CP_NO);
    expect(loadRes.ok()).toBe(true);
    const loadData = await loadRes.json();
    expect(loadData.success).toBe(true);

    // 데이터 검증: sortOrder 순서대로 로드
    const loaded = loadData.data;
    expect(loaded.length).toBe(3);
    expect(loaded[0].processNo).toBe('10');
    expect(loaded[0].partName).toBe('PartA');
    expect(loaded[0].sortOrder).toBe(0);
    expect(loaded[1].sortOrder).toBe(1);
    expect(loaded[2].processNo).toBe('20');
    expect(loaded[2].partName).toBe('PartB');
    expect(loaded[2].sortOrder).toBe(2);
  });

  test('2. part insertAbove 결과 저장→로드: partName 빈값 + sortOrder 연속', async ({ request }) => {
    const checkRes = await loadCPItems(request, TEST_CP_NO);
    if (checkRes.status() === 404) { test.skip(); return; }

    // part insertAbove 시뮬레이션: 새 행(partName='')을 그룹 시작에 삽입
    const items = [
      // 새로 삽입된 행 (partName 빈값, A~E 확장병합)
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: '', equipment: 'Press-01', sortOrder: 0 }),
      // 기존 PartA 그룹
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: 'PartA', equipment: 'Press-01', sortOrder: 1 }),
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: 'PartA', equipment: 'Press-01', sortOrder: 2 }),
      makeTestItem({ processNo: '20', processName: 'Weld', processLevel: 'L2', processDesc: 'Welding', partName: 'PartB', equipment: 'Welder-01', sortOrder: 3 }),
    ];

    const saveRes = await saveCPItems(request, TEST_CP_NO, items);
    if (saveRes.status() === 404) { test.skip(); return; }
    expect(saveRes.ok()).toBe(true);

    // 로드하여 검증
    const loadRes = await loadCPItems(request, TEST_CP_NO);
    const loadData = await loadRes.json();
    const loaded = loadData.data;

    expect(loaded.length).toBe(4);

    // 새 행: partName 빈값, 부모 열 확장병합
    expect(loaded[0].partName).toBe('');
    expect(loaded[0].processNo).toBe('10');
    expect(loaded[0].processName).toBe('Press');
    expect(loaded[0].equipment).toBe('Press-01');
    expect(loaded[0].sortOrder).toBe(0);

    // 기존 PartA 행들
    expect(loaded[1].partName).toBe('PartA');
    expect(loaded[1].sortOrder).toBe(1);
    expect(loaded[2].partName).toBe('PartA');
    expect(loaded[2].sortOrder).toBe(2);

    // PartB
    expect(loaded[3].partName).toBe('PartB');
    expect(loaded[3].sortOrder).toBe(3);
  });

  test('3. part insertBelow 결과 저장→로드: 그룹 끝+1에 삽입', async ({ request }) => {
    const checkRes = await loadCPItems(request, TEST_CP_NO);
    if (checkRes.status() === 404) { test.skip(); return; }

    // part insertBelow 시뮬레이션: PartA 그룹 끝 다음에 빈 행 삽입
    const items = [
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: 'PartA', equipment: 'Press-01', sortOrder: 0 }),
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: 'PartA', equipment: 'Press-01', sortOrder: 1 }),
      // 새로 삽입된 행 (partName 빈값, A~E 확장병합)
      makeTestItem({ processNo: '10', processName: 'Press', processLevel: 'L1', processDesc: 'Pressing', partName: '', equipment: 'Press-01', sortOrder: 2 }),
      makeTestItem({ processNo: '20', processName: 'Weld', processLevel: 'L2', processDesc: 'Welding', partName: 'PartB', equipment: 'Welder-01', sortOrder: 3 }),
    ];

    const saveRes = await saveCPItems(request, TEST_CP_NO, items);
    if (saveRes.status() === 404) { test.skip(); return; }
    expect(saveRes.ok()).toBe(true);

    const loadRes = await loadCPItems(request, TEST_CP_NO);
    const loadData = await loadRes.json();
    const loaded = loadData.data;

    expect(loaded.length).toBe(4);
    expect(loaded[0].partName).toBe('PartA');
    expect(loaded[1].partName).toBe('PartA');
    expect(loaded[2].partName).toBe('');  // 새 행
    expect(loaded[2].processNo).toBe('10');  // 부모 확장병합
    expect(loaded[3].partName).toBe('PartB');

    // sortOrder 연속 검증
    loaded.forEach((item: any, idx: number) => {
      expect(item.sortOrder).toBe(idx);
    });
  });

  test('4. general 타입 행 삽입 후 저장→로드 검증', async ({ request }) => {
    const checkRes = await loadCPItems(request, TEST_CP_NO);
    if (checkRes.status() === 404) { test.skip(); return; }

    // general insertBelow: 현재 행 바로 아래에 삽입 (processNo 복사)
    const items = [
      makeTestItem({ processNo: '10', processName: 'Press', specTolerance: '0.5mm', evalMethod: 'Gauge', sortOrder: 0 }),
      // general insertBelow 결과: processNo 복사, 나머지 빈값
      makeTestItem({ processNo: '10', processName: 'Press', sortOrder: 1 }),
      makeTestItem({ processNo: '20', processName: 'Weld', specTolerance: '1.0mm', sortOrder: 2 }),
    ];

    const saveRes = await saveCPItems(request, TEST_CP_NO, items);
    if (saveRes.status() === 404) { test.skip(); return; }
    expect(saveRes.ok()).toBe(true);

    const loadRes = await loadCPItems(request, TEST_CP_NO);
    const loadData = await loadRes.json();
    const loaded = loadData.data;

    expect(loaded.length).toBe(3);
    expect(loaded[0].specTolerance).toBe('0.5mm');
    expect(loaded[1].processNo).toBe('10');
    expect(loaded[1].specTolerance).toBe('');  // 새 행: 빈값
    expect(loaded[2].specTolerance).toBe('1.0mm');
  });

  test('E-01. 행 삭제 후 DB 라운드트립: sortOrder 재정렬', async ({ request }) => {
    const checkRes = await loadCPItems(request, TEST_CP_NO);
    if (checkRes.status() === 404) { test.skip(); return; }

    // 1. 5행 PUT (sortOrder 0~4)
    const fiveItems = [
      makeTestItem({ processNo: '10', processName: 'Press', partName: 'PartA', sortOrder: 0 }),
      makeTestItem({ processNo: '20', processName: 'Weld', partName: 'PartB', sortOrder: 1 }),
      makeTestItem({ processNo: '30', processName: 'Paint', partName: 'PartC', sortOrder: 2 }),
      makeTestItem({ processNo: '40', processName: 'Assy', partName: 'PartD', sortOrder: 3 }),
      makeTestItem({ processNo: '50', processName: 'Insp', partName: 'PartE', sortOrder: 4 }),
    ];

    const saveRes1 = await saveCPItems(request, TEST_CP_NO, fiveItems);
    if (saveRes1.status() === 404) { test.skip(); return; }
    expect(saveRes1.ok()).toBe(true);

    // 2. GET으로 5행 확인
    const loadRes1 = await loadCPItems(request, TEST_CP_NO);
    const loadData1 = await loadRes1.json();
    expect(loadData1.data.length).toBe(5);

    // 3. 2번째 행(processNo='20') 제거 → 4행 PUT (sortOrder 0~3 재정렬)
    const fourItems = [
      makeTestItem({ processNo: '10', processName: 'Press', partName: 'PartA', sortOrder: 0 }),
      makeTestItem({ processNo: '30', processName: 'Paint', partName: 'PartC', sortOrder: 1 }),
      makeTestItem({ processNo: '40', processName: 'Assy', partName: 'PartD', sortOrder: 2 }),
      makeTestItem({ processNo: '50', processName: 'Insp', partName: 'PartE', sortOrder: 3 }),
    ];

    const saveRes2 = await saveCPItems(request, TEST_CP_NO, fourItems);
    expect(saveRes2.ok()).toBe(true);

    // 4. GET으로 4행 확인
    const loadRes2 = await loadCPItems(request, TEST_CP_NO);
    const loadData2 = await loadRes2.json();
    const loaded = loadData2.data;
    expect(loaded.length).toBe(4);

    // 5. sortOrder가 0,1,2,3 연속인지 검증
    loaded.forEach((item: any, idx: number) => {
      expect(item.sortOrder).toBe(idx);
    });

    // 6. 삭제된 행(processNo='20')이 없는지 검증
    const deletedRow = loaded.find((item: any) => item.processNo === '20');
    expect(deletedRow).toBeUndefined();

    // processNo 순서 검증
    expect(loaded[0].processNo).toBe('10');
    expect(loaded[1].processNo).toBe('30');
    expect(loaded[2].processNo).toBe('40');
    expect(loaded[3].processNo).toBe('50');
  });

  test('E-02. process(AB) 고유값 행 DB 저장/로드', async ({ request }) => {
    const checkRes = await loadCPItems(request, TEST_CP_NO);
    if (checkRes.status() === 404) { test.skip(); return; }

    // AB insertAbove 시뮬레이션: 고유값 processNo/processName 삽입
    const uniqueProcessNo = `_unique_${Date.now()}`;
    const uniqueProcessName = `UniqueProc_${Date.now()}`;

    const items = [
      makeTestItem({ processNo: '10', processName: 'Press', partName: 'PartA', sortOrder: 0 }),
      // 고유값 행 (insertAbove 결과)
      makeTestItem({ processNo: uniqueProcessNo, processName: uniqueProcessName, partName: '', sortOrder: 1 }),
      makeTestItem({ processNo: '20', processName: 'Weld', partName: 'PartB', sortOrder: 2 }),
      makeTestItem({ processNo: '30', processName: 'Paint', partName: 'PartC', sortOrder: 3 }),
    ];

    // 1. 고유값 포함 4행 PUT
    const saveRes = await saveCPItems(request, TEST_CP_NO, items);
    if (saveRes.status() === 404) { test.skip(); return; }
    expect(saveRes.ok()).toBe(true);

    // 2. GET으로 로드
    const loadRes = await loadCPItems(request, TEST_CP_NO);
    const loadData = await loadRes.json();
    const loaded = loadData.data;

    expect(loaded.length).toBe(4);

    // 3. 고유값 행의 processNo가 정확히 저장되었는지 검증
    const uniqueRow = loaded.find((item: any) => item.processNo === uniqueProcessNo);
    expect(uniqueRow).toBeDefined();
    expect(uniqueRow.processNo).toBe(uniqueProcessNo);
    expect(uniqueRow.processName).toBe(uniqueProcessName);

    // 4. sortOrder 연속성 검증
    loaded.forEach((item: any, idx: number) => {
      expect(item.sortOrder).toBe(idx);
    });
  });

  test('E-03. 병합 결과 DB 라운드트립: 같은 processNo 연속 행', async ({ request }) => {
    const checkRes = await loadCPItems(request, TEST_CP_NO);
    if (checkRes.status() === 404) { test.skip(); return; }

    // mergeUp 결과 시뮬레이션: 같은 processNo를 가진 연속 행 3개 + 다른 1개
    const items = [
      makeTestItem({ processNo: '10', processName: 'Press', partName: 'PartA', equipment: 'Press-01', sortOrder: 0 }),
      makeTestItem({ processNo: '10', processName: 'Press', partName: 'PartA', equipment: 'Press-01', sortOrder: 1 }),
      makeTestItem({ processNo: '10', processName: 'Press', partName: 'PartA', equipment: 'Press-01', sortOrder: 2 }),
      makeTestItem({ processNo: '20', processName: 'Weld', partName: 'PartB', equipment: 'Welder-01', sortOrder: 3 }),
    ];

    // 1. 4행 PUT
    const saveRes = await saveCPItems(request, TEST_CP_NO, items);
    if (saveRes.status() === 404) { test.skip(); return; }
    expect(saveRes.ok()).toBe(true);

    // 2. GET으로 로드
    const loadRes = await loadCPItems(request, TEST_CP_NO);
    const loadData = await loadRes.json();
    const loaded = loadData.data;

    expect(loaded.length).toBe(4);

    // 3. 처음 3행의 processNo가 모두 같은지 검증
    expect(loaded[0].processNo).toBe('10');
    expect(loaded[1].processNo).toBe('10');
    expect(loaded[2].processNo).toBe('10');

    // 4. processName도 같은지 검증
    expect(loaded[0].processName).toBe('Press');
    expect(loaded[1].processName).toBe('Press');
    expect(loaded[2].processName).toBe('Press');

    // partName도 동일하게 유지
    expect(loaded[0].partName).toBe('PartA');
    expect(loaded[1].partName).toBe('PartA');
    expect(loaded[2].partName).toBe('PartA');

    // 5. 4번째 행은 다른 processNo인지 검증
    expect(loaded[3].processNo).toBe('20');
    expect(loaded[3].processName).toBe('Weld');
    expect(loaded[3].partName).toBe('PartB');

    // sortOrder 연속성 검증
    loaded.forEach((item: any, idx: number) => {
      expect(item.sortOrder).toBe(idx);
    });
  });
});
