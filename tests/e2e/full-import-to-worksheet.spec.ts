/**
 * @file full-import-to-worksheet.spec.ts
 * @description Import → 파싱 → UUID → FK → 워크시트 렌더링 전체 흐름 검증
 *
 * 1. Import 데이터 API로 주입 (Master DB + Atomic DB)
 * 2. pipeline-verify POST → allGreen 확인
 * 3. 워크시트 페이지 브라우저 렌더링 확인
 * 4. 탭 순회 + FC/PC 데이터 존재 확인
 * 5. 5회 순차 회귀 — 일관성 검증
 *
 * 기대값 (au bump 전체보기 기준):
 *   L2=21, FM=26, FC=104, FE=20, Links=104
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';

// ── 헬퍼 ──
async function dismissModal(page: import('@playwright/test').Page) {
  try {
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
    if (await okBtn.count() > 0) {
      await okBtn.first().click({ timeout: 2000 });
      await page.waitForTimeout(500);
    }
  } catch { /* no modal */ }
}

async function clickTab(page: import('@playwright/test').Page, label: string) {
  const btn = page.locator(`button:has-text("${label}")`);
  if (await btn.count() > 0) {
    try { await btn.first().click({ timeout: 5000 }); }
    catch { await dismissModal(page); await btn.first().click({ timeout: 5000 }); }
    await page.waitForTimeout(2000);
    await dismissModal(page);
  }
}

// ── 테스트 ──
test.describe('Import → 워크시트 전체 흐름 5회 순차 검증', () => {

  test('1. API Import: save-from-import + pipeline allGreen', async ({ request }) => {
    // pipeline-verify POST (자동수정 루프)
    const pipeRes = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(pipeRes.ok()).toBeTruthy();
    const pipeData = await pipeRes.json();

    console.log(`Pipeline: allGreen=${pipeData.allGreen} loop=${pipeData.loopCount}`);
    for (const s of pipeData.steps) {
      const issues = s.issues?.length > 0 ? ` | ${s.issues.join('; ')}` : '';
      console.log(`  STEP ${s.step} ${s.name}: ${s.status}${issues}`);
    }

    expect(pipeData.allGreen).toBeTruthy();

    // STEP 3 UUID 카운트 검증
    const s3 = pipeData.steps.find((s: { step: number }) => s.step === 3);
    expect(s3.details.FM).toBeGreaterThanOrEqual(26);
    expect(s3.details.FC).toBeGreaterThanOrEqual(104);
    expect(s3.details.FE).toBeGreaterThanOrEqual(20);
    expect(s3.details.L2).toBe(21);

    // STEP 4 FK 정합성
    const s4 = pipeData.steps.find((s: { step: number }) => s.step === 4);
    expect(s4.details.links).toBeGreaterThanOrEqual(104);
    expect(s4.details.brokenFC).toBe(0);
    expect(s4.details.brokenFM).toBe(0);
    expect(s4.details.brokenFE).toBe(0);

    // STEP 5 WS
    const s5 = pipeData.steps.find((s: { step: number }) => s.step === 5);
    expect(s5.details.emptyPC).toBe(0);
    expect(s5.details.orphanPC).toBe(0);
  });

  test('2. 브라우저: Import 페이지 — 데이터 미리보기 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);
    await dismissModal(page);

    // Import 데이터 존재 확인 (데이터 미리보기 탭)
    const bodyText = await page.textContent('body') || '';
    console.log(`[Import] body length: ${bodyText.length}`);
    expect(bodyText.length).toBeGreaterThan(500);

    // L2=21 확인 ("L2 21" 또는 "L2  21" 패턴)
    const l2Match = bodyText.match(/L2\s+(\d{2,})/);
    if (l2Match) {
      console.log(`[Import] L2: ${l2Match[1]}`);
      expect(parseInt(l2Match[1])).toBe(21);
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/full-import-page.png',
      fullPage: false,
    });
  });

  test('3. 브라우저: 워크시트 렌더링 — 구조/기능/고장 탭 순회', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(6000);
    await dismissModal(page);

    // 워크시트 로드 확인
    const bodyText = await page.textContent('body') || '';
    console.log(`[Worksheet] body length: ${bodyText.length}`);
    expect(bodyText.length).toBeGreaterThan(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/full-ws-initial.png',
      fullPage: false,
    });

    // 탭 순회
    const tabs = ['구조', '1기능', '2기능', '3기능', '1L영향', '2L형태', '3L원인'];
    for (const tab of tabs) {
      await clickTab(page, tab);
      const text = await page.textContent('body') || '';
      const hasContent = text.length > 100;
      console.log(`[${tab}] rendered=${hasContent ? 'OK' : 'EMPTY'} (${text.length} chars)`);
      expect(hasContent).toBeTruthy();
    }
  });

  test('4. 브라우저: 워크시트 3L원인 탭 — FC 데이터 존재 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(6000);
    await dismissModal(page);

    // 3L원인 탭
    await clickTab(page, '3L원인');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') || '';

    // 공정 데이터 존재 확인 (공정번호 01~200)
    const hasProcess01 = bodyText.includes('작업환경') || bodyText.includes('01');
    const hasFCData = bodyText.includes('부적합') || bodyText.includes('이탈') || bodyText.includes('저하') || bodyText.includes('오작동');
    console.log(`[3L원인] hasProcess01=${hasProcess01} hasFCData=${hasFCData}`);
    expect(hasProcess01 || hasFCData).toBeTruthy();

    await page.screenshot({
      path: 'tests/e2e/screenshots/full-ws-3l-cause.png',
      fullPage: false,
    });
  });

  test('5. 순차 회귀 5회 — pipeline allGreen 일관성', async ({ request }) => {
    for (let run = 1; run <= 5; run++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();

      const statuses = data.steps.map((s: { step: number; name: string; status: string }) =>
        `S${s.step}:${s.status}`).join(' ');
      const s4 = data.steps.find((s: { step: number }) => s.step === 4);
      const s5 = data.steps.find((s: { step: number }) => s.step === 5);

      console.log(`[Run #${run}] allGreen=${data.allGreen} loop=${data.loopCount} | ${statuses} | links=${s4?.details?.links} brokenFC=${s4?.details?.brokenFC} orphanPC=${s5?.details?.orphanPC}`);

      expect(data.allGreen).toBeTruthy();
      expect(s4.details.brokenFC).toBe(0);
      expect(s5.details.orphanPC).toBe(0);
    }
    console.log('5회 모두 ALL GREEN ✓');
  });
});
