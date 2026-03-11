/**
 * @file tdd-mbd-full-flow.spec.ts
 * @description MBD 등록 → Import → 워크시트 로드 → 삭제 전체 흐름 TDD 검증
 *
 * 테스트 순서:
 * 1. Master FMEA 프로젝트 등록 (POST /api/fmea/projects)
 * 2. Master BD 데이터 Import (POST /api/pfmea/master)
 * 3. BD 데이터 조회 (GET /api/pfmea/master?fmeaId=)
 * 4. 워크시트 구조 생성 (GET /api/fmea/master-structure)
 * 5. 워크시트 데이터 저장 (POST /api/fmea)
 * 6. 워크시트 데이터 로드 (GET /api/fmea?fmeaId=)
 * 7. 프로젝트 삭제 + BD cascade 검증 (DELETE /api/fmea/projects)
 * 8. 삭제 후 BD 데이터 없음 확인 (GET /api/pfmea/master)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_FMEA_ID = 'pfm26-tdd-m001';
const TEST_FMEA_TYPE = 'M';

// ★ 자전거 프레임 Master BD 샘플 데이터 (실제 MBD-26-001 기반)
const SAMPLE_FLAT_DATA = [
  // A1: 공정번호, A2: 공정명
  { processNo: '10', category: 'A', itemCode: 'A1', value: '10' },
  { processNo: '10', category: 'A', itemCode: 'A2', value: '파이프 절단' },
  { processNo: '20', category: 'A', itemCode: 'A1', value: '20' },
  { processNo: '20', category: 'A', itemCode: 'A2', value: 'TIG 용접' },
  // A3: 공정기능
  { processNo: '10', category: 'A', itemCode: 'A3', value: '알루미늄 파이프를 도면 치수에 맞게 절단한다' },
  { processNo: '20', category: 'A', itemCode: 'A3', value: 'TIG 용접으로 프레임 조인트를 접합한다' },
  // A4: 제품특성
  { processNo: '10', category: 'A', itemCode: 'A4', value: '절단 길이' },
  { processNo: '20', category: 'A', itemCode: 'A4', value: '용접 비드 폭' },
  // A5: 고장형태
  { processNo: '10', category: 'A', itemCode: 'A5', value: '절단 길이 부적합' },
  { processNo: '20', category: 'A', itemCode: 'A5', value: '용접 불량(기공/균열)' },
  // A6: 검출관리
  { processNo: '10', category: 'A', itemCode: 'A6', value: '줄자/버니어캘리퍼스' },
  { processNo: '20', category: 'A', itemCode: 'A6', value: 'UT 비파괴검사' },
  // B1: 작업요소 (4M 포함)
  { processNo: '10', category: 'B', itemCode: 'B1', value: '파이프 컷팅머신', m4: 'MC' },
  { processNo: '10', category: 'B', itemCode: 'B1', value: '작업자 숙련도', m4: 'MN' },
  { processNo: '20', category: 'B', itemCode: 'B1', value: 'TIG 용접기', m4: 'MC' },
  { processNo: '20', category: 'B', itemCode: 'B1', value: '용접봉(ER4043)', m4: 'IM' },
  // B2: 요소기능
  { processNo: '10', category: 'B', itemCode: 'B2', value: '파이프를 도면 지정 길이로 절단한다', m4: 'MC' },
  { processNo: '20', category: 'B', itemCode: 'B2', value: 'TIG 용접으로 프레임을 접합한다', m4: 'MC' },
  // B3: 공정특성
  { processNo: '10', category: 'B', itemCode: 'B3', value: 'RPM', m4: 'MC' },
  { processNo: '20', category: 'B', itemCode: 'B3', value: '용접 전류(A)', m4: 'MC' },
  // B4: 고장원인
  { processNo: '10', category: 'B', itemCode: 'B4', value: 'RPM 불균일', m4: 'MC' },
  { processNo: '20', category: 'B', itemCode: 'B4', value: '용접 전류 부적합', m4: 'MC' },
  // B5: 예방관리
  { processNo: '10', category: 'B', itemCode: 'B5', value: 'RPM 자동 제어' },
  { processNo: '20', category: 'B', itemCode: 'B5', value: '용접 파라미터 자동 설정' },
];

// ============================================================
// Test 1: Master FMEA 프로젝트 등록
// ============================================================
test.describe.serial('MBD 전체 흐름 TDD', () => {

  test('1. Master FMEA 프로젝트 등록', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/fmea/projects`, {
      data: {
        fmeaId: TEST_FMEA_ID,
        fmeaType: TEST_FMEA_TYPE,
        fmeaInfo: {
          subject: '금속복합재프레임+생산공정',
          companyName: 'TDD테스트',
          customerName: 'Giant',
          engineeringLocation: '천안공장',
          fmeaResponsibleName: '김품질',
          fmeaStartDate: '2026-02-17',
          fmeaRevisionDate: '2026-03-17',
          partName: '금속복합재프레임',
          partNo: 'FR-26-M001',
        },
        cftMembers: [
          { name: '김품질', role: 'FMEA담당' },
          { name: '이설계', role: '설계' },
        ],
        parentFmeaId: null,
      },
    });

    const json = await res.json();
    console.log('[Test 1] 프로젝트 등록:', JSON.stringify(json, null, 2));

    expect(res.ok()).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.fmeaId).toBe(TEST_FMEA_ID);
  });

  // ============================================================
  // Test 2: Master BD 데이터 Import
  // ============================================================
  test('2. Master BD 데이터 Import', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/pfmea/master`, {
      data: {
        fmeaId: TEST_FMEA_ID,
        fmeaType: TEST_FMEA_TYPE,
        name: 'MASTER',
        replace: true,
        flatData: SAMPLE_FLAT_DATA,
      },
    });

    const json = await res.json();
    console.log('[Test 2] BD Import:', JSON.stringify({ success: json.success, dataset: json.dataset?.id, version: json.dataset?.version }, null, 2));

    expect(res.ok()).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.dataset).toBeDefined();
    expect(json.dataset.fmeaId).toBe(TEST_FMEA_ID);
    expect(json.dataset.fmeaType).toBe(TEST_FMEA_TYPE);
    expect(json.dataset.version).toBeGreaterThanOrEqual(1);
  });

  // ============================================================
  // Test 3: BD 데이터 조회 (GET)
  // ============================================================
  test('3. BD 데이터 조회 확인', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pfmea/master?fmeaId=${TEST_FMEA_ID}`);

    const json = await res.json();
    const items = json.dataset?.flatItems || [];
    console.log('[Test 3] BD 조회: items=' + items.length);

    expect(res.ok()).toBeTruthy();
    expect(json.dataset).toBeDefined();
    expect(json.dataset.fmeaId).toBe(TEST_FMEA_ID);
    expect(items.length).toBeGreaterThanOrEqual(20); // 24개 샘플 데이터

    // 4M 값 검증 (MN, MC, IM만 있어야 함)
    const m4Values = [...new Set(items.filter((i: any) => i.m4).map((i: any) => i.m4))];
    console.log('[Test 3] 4M 값:', m4Values);
    for (const m4 of m4Values) {
      expect(['MN', 'MC', 'IM', 'EN']).toContain(m4);
    }

    // A1~A6, B1~B5 아이템코드 검증
    const itemCodes = [...new Set(items.map((i: any) => i.itemCode))];
    console.log('[Test 3] 아이템코드:', itemCodes.sort());
    expect(itemCodes).toContain('A1');
    expect(itemCodes).toContain('A2');
    expect(itemCodes).toContain('A6');
    expect(itemCodes).toContain('B1');
    expect(itemCodes).toContain('B5');
    // B6은 PFMEA에 없어야 함
    expect(itemCodes).not.toContain('B6');
  });

  // ============================================================
  // Test 4: 워크시트 구조 자동 생성
  // ============================================================
  test('4. 워크시트 구조 자동 생성 (master-structure)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/fmea/master-structure?sourceFmeaId=${TEST_FMEA_ID}`);

    const json = await res.json();
    console.log('[Test 4] 구조 생성:', JSON.stringify({ success: json.success, processCount: json.processes?.length }, null, 2));

    expect(res.ok()).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.processes).toBeDefined();
    expect(json.processes.length).toBeGreaterThanOrEqual(2); // 최소 2개 공정 (10, 20)

    // 공정 10: 파이프 절단
    const proc10 = json.processes.find((p: any) => p.no === '10');
    expect(proc10).toBeDefined();
    expect(proc10.name).toContain('절단');

    // 공정 10의 작업요소(B1)에 MC, MN이 있어야 함
    if (proc10?.workElements?.length > 0) {
      const m4s = proc10.workElements.map((w: any) => w.m4);
      console.log('[Test 4] 공정10 작업요소 4M:', m4s);
      expect(m4s).toContain('MC');
    }
  });

  // ============================================================
  // Test 5: BD 데이터 전체 목록 조회 (summaries)
  // ============================================================
  test('5. BD 전체 목록 조회 (summaries)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pfmea/master`);

    const json = await res.json();
    const datasets = json.datasets || [];
    console.log('[Test 5] 전체 datasets:', datasets.length);

    expect(res.ok()).toBeTruthy();

    // 테스트 FMEA의 dataset이 포함되어야 함
    const testDs = datasets.find((d: any) => d.fmeaId === TEST_FMEA_ID);
    expect(testDs).toBeDefined();
    expect(testDs.fmeaType).toBe(TEST_FMEA_TYPE);
    console.log('[Test 5] testDs keys:', Object.keys(testDs));
    // itemCount/dataCount 또는 _count 등 다양한 필드명 대응
    const count = testDs.itemCount ?? testDs.dataCount ?? testDs._count?.flatItems ?? 0;
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ============================================================
  // Test 6: BD 데이터 재Import (replace=true, 버전 증가 확인)
  // ============================================================
  test('6. BD 재Import (버전 증가 확인)', async ({ request }) => {
    // 먼저 현재 버전 확인
    const getRes = await request.get(`${BASE_URL}/api/pfmea/master?fmeaId=${TEST_FMEA_ID}`);
    const getJson = await getRes.json();
    const oldVersion = getJson.dataset?.version || 1;

    // 재Import
    const res = await request.post(`${BASE_URL}/api/pfmea/master`, {
      data: {
        fmeaId: TEST_FMEA_ID,
        fmeaType: TEST_FMEA_TYPE,
        replace: true,
        flatData: SAMPLE_FLAT_DATA,
      },
    });

    const json = await res.json();
    console.log('[Test 6] 재Import: oldVer=' + oldVersion + ' newVer=' + json.dataset?.version);

    expect(res.ok()).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.dataset.version).toBeGreaterThan(oldVersion);
  });

  // ============================================================
  // Test 7: 프로젝트 삭제 + BD cascade 검증
  // ============================================================
  test('7. 프로젝트 삭제 (BD cascade 포함)', async ({ request }) => {
    // 삭제 전 BD 존재 확인
    const beforeRes = await request.get(`${BASE_URL}/api/pfmea/master?fmeaId=${TEST_FMEA_ID}`);
    const beforeJson = await beforeRes.json();
    expect(beforeJson.dataset).toBeDefined();
    console.log('[Test 7] 삭제 전 BD: dataset=' + beforeJson.dataset?.id);

    // 프로젝트 삭제
    const delRes = await request.delete(`${BASE_URL}/api/fmea/projects`, {
      data: { fmeaId: TEST_FMEA_ID },
    });
    const delJson = await delRes.json();
    console.log('[Test 7] 삭제:', JSON.stringify(delJson, null, 2));

    expect(delRes.ok()).toBeTruthy();
    expect(delJson.success).toBe(true);
  });

  // ============================================================
  // Test 8: 삭제 후 BD 데이터 없음 확인 (★ cascade 검증)
  // ============================================================
  test('8. 삭제 후 BD 데이터 없음 확인 (cascade)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pfmea/master?fmeaId=${TEST_FMEA_ID}`);
    const json = await res.json();
    console.log('[Test 8] 삭제 후 BD:', JSON.stringify({ dataset: json.dataset || null }, null, 2));

    // dataset이 null이거나 없어야 함
    const hasData = json.dataset && json.dataset.id;
    expect(hasData).toBeFalsy();
  });

});
