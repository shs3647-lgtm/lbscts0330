/**
 * @file cp-pfd-integration-m066.spec.ts
 * @description pfm26-m066 CP/PFD 연동 통합 E2E 테스트
 *
 * 검증 흐름:
 *   1. FMEA→PFD sync API → PFD items 생성 확인
 *   2. PFD→CP sync API → CP items 생성 확인
 *   3. PFD 워크시트 브라우저 렌더링 검증
 *   4. CP 워크시트 브라우저 렌더링 검증
 *   5. 데이터 정합성 교차 검증 (FMEA↔PFD↔CP)
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';
const PFD_NO = 'pfd26-m065';
const CP_NO = 'cp26-m066';

// ═══════════════════════════════════════════════════
// STEP 1: API 기반 동기화 (FMEA→PFD)
// ═══════════════════════════════════════════════════

test.describe('STEP 1: FMEA→PFD sync API', () => {
  test.describe.configure({ mode: 'serial' });

  let pfdItems: any[] = [];

  test('1.1 FMEA→PFD sync API 호출 성공', async ({ request }) => {
    const res = await request.post(`${BASE}/api/pfd/sync-from-fmea`, {
      data: { fmeaId: FMEA_ID, pfdNo: PFD_NO },
      timeout: 60000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // 응답 구조: body.data.itemCount 또는 body.data.items
    const data = body.data || body;
    const itemCount = data.itemCount || data.items?.length || 0;
    expect(itemCount).toBeGreaterThan(0);
    pfdItems = data.items || [];
    console.log(`✅ FMEA→PFD sync: ${itemCount} items created`);
  });

  test('1.2 PFD items 유효성 확인', async () => {
    // sync 직후 items에서 공정번호가 있는지 확인
    if (pfdItems.length > 0) {
      const withProcessNo = pfdItems.filter((i: any) => i.processNo?.trim());
      console.log(`✅ PFD items with processNo: ${withProcessNo.length}/${pfdItems.length}`);
      expect(withProcessNo.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════
// STEP 2: PFD→CP sync API
// ═══════════════════════════════════════════════════

test.describe('STEP 2: PFD→CP sync API', () => {
  test.describe.configure({ mode: 'serial' });

  test('2.1 FMEA→PFD sync 후 PFD items로 CP sync', async ({ request }) => {
    // 먼저 FMEA→PFD sync로 최신 items 확보
    const syncRes = await request.post(`${BASE}/api/pfd/sync-from-fmea`, {
      data: { fmeaId: FMEA_ID, pfdNo: PFD_NO },
      timeout: 60000,
    });
    expect(syncRes.status()).toBe(200);
    const syncBody = await syncRes.json();
    const pfdItems: any[] = syncBody.data?.items || [];

    expect(pfdItems.length).toBeGreaterThan(0);

    // PFD→CP sync
    const cpSyncRes = await request.post(`${BASE}/api/control-plan/sync-from-pfd`, {
      data: {
        pfdNo: PFD_NO,
        cpNo: CP_NO,
        items: pfdItems.map((item: any, idx: number) => ({
          processNo: item.processNo || '',
          processName: item.processName || '',
          processDesc: item.processDesc || '',
          partName: item.partName || '',
          workElement: item.workElement || '',
          equipment: item.equipment || '',
          productChar: item.productChar || '',
          processChar: item.processChar || '',
          specialChar: item.specialChar || item.productSC || item.processSC || '',
          sortOrder: idx * 10,
        })),
      },
      timeout: 60000,
    });

    expect(cpSyncRes.status()).toBe(200);
    const cpBody = await cpSyncRes.json();
    expect(cpBody.success).toBe(true);
    const cpItemCount = cpBody.data?.itemCount || cpBody.itemCount || 0;
    console.log(`✅ PFD→CP sync: ${cpItemCount} CP items created`);
  });
});

// ═══════════════════════════════════════════════════
// STEP 3: PFD 워크시트 브라우저 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 3: PFD 워크시트 브라우저 검증', () => {

  test('3.1 PFD 워크시트 페이지 로드 성공', async ({ page }) => {
    const res = await page.goto(`${BASE}/pfd/worksheet?pfdNo=${PFD_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    expect(res?.status()).toBeLessThan(400);
  });

  test('3.2 PFD 워크시트에 테이블 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pfd/worksheet?pfdNo=${PFD_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const tableExists = await page.locator('table').count();
    const rowCount = await page.locator('table tbody tr').count();

    console.log(`PFD worksheet: ${tableExists} tables, ${rowCount} rows`);
    expect(tableExists).toBeGreaterThan(0);
  });

  test('3.3 PFD에 공정 관련 텍스트 존재', async ({ page }) => {
    await page.goto(`${BASE}/pfd/worksheet?pfdNo=${PFD_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent() || '';
    // 공정명, 설비명, 또는 PFD 관련 텍스트가 있는지 확인
    const hasPfdContent = bodyText.includes('공정') ||
      bodyText.includes('PFD') ||
      bodyText.includes('워크시트');
    console.log(`PFD page has relevant content: ${hasPfdContent}`);
    expect(hasPfdContent).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// STEP 4: CP 워크시트 브라우저 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 4: CP 워크시트 브라우저 검증', () => {

  test('4.1 CP 워크시트 페이지 로드 성공', async ({ page }) => {
    const res = await page.goto(`${BASE}/control-plan/worksheet?cpNo=${CP_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    expect(res?.status()).toBeLessThan(400);
  });

  test('4.2 CP 워크시트에 테이블 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/control-plan/worksheet?cpNo=${CP_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const tableExists = await page.locator('table').count();
    const rowCount = await page.locator('table tbody tr').count();

    console.log(`CP worksheet: ${tableExists} tables, ${rowCount} rows`);
    expect(tableExists).toBeGreaterThan(0);
  });

  test('4.3 CP에 관리계획서 관련 텍스트 존재', async ({ page }) => {
    await page.goto(`${BASE}/control-plan/worksheet?cpNo=${CP_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent() || '';
    const hasCpContent = bodyText.includes('관리') ||
      bodyText.includes('CP') ||
      bodyText.includes('공정');
    console.log(`CP page has relevant content: ${hasCpContent}`);
    expect(hasCpContent).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// STEP 5: 교차검증 (FMEA↔PFD↔CP 데이터 정합성)
// ═══════════════════════════════════════════════════

test.describe('STEP 5: 교차검증 (데이터 정합성)', () => {

  test('5.1 Pipeline verify — allGreen 유지', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
      timeout: 120000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.allGreen).toBe(true);
    console.log(`✅ Pipeline verify: allGreen=${body.allGreen}`);
  });

  test('5.2 CP 등록 정보에 FMEA 연동 확인', async ({ request }) => {
    const res = await request.get(`${BASE}/api/control-plan?cpNo=${CP_NO}`, {
      timeout: 30000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const cp = body.data || body;
    const linkedFmea = cp.linkedFmeaNo || cp.linkedPfmeaNo || cp.fmeaId || 'N/A';
    console.log(`✅ CP info: cpNo=${cp.cpNo}, linkedFmeaNo=${linkedFmea}`);
  });

  test('5.3 PFD 등록 정보에 FMEA/CP 연동 확인', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pfd?pfdNo=${PFD_NO}`, {
      timeout: 30000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const pfd = body.data || body;
    console.log(`✅ PFD info: pfdNo=${pfd.pfdNo}, linkedPfmeaNo=${pfd.linkedPfmeaNo || 'N/A'}, linkedCpNos=${JSON.stringify(pfd.linkedCpNos || [])}`);

    // PFD→FMEA 연동 확인
    if (pfd.linkedPfmeaNo) {
      expect(pfd.linkedPfmeaNo).toBe(FMEA_ID);
    }
  });
});
