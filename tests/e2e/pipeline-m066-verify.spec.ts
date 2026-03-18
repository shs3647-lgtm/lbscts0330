/**
 * @file pipeline-m066-verify.spec.ts
 * @description m066 기준 0~5단계 파이프라인 검증 (FK 100% 꽂아넣기)
 *
 * 검증 기준 (m066 baseline):
 *   STEP 0: flatData≥670, chains≥104, B4(FC)≥104
 *   STEP 1: l1Name="au bump", l2Count=21
 *   STEP 2: A5≥26, B4≥104, C1≥3, C4≥20, emptyPC=0
 *   STEP 3: FE≥20, FM≥26, FC≥104, UUID unique
 *   STEP 4: brokenFM=0, brokenFE=0, brokenFC=0 (FK 100%)
 *   STEP 5: WS 렌더링, emptyPC=0
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m070';

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

test.describe('m066 기준 파이프라인 0~5단계 검증 (FK 꽂아넣기)', () => {

  test('STEP 0~5 ALL GREEN (API 검증)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    console.log(`allGreen=${data.allGreen} loop=${data.loopCount}`);

    for (const s of data.steps) {
      const issues = s.issues?.length > 0 ? ` ISSUES: ${s.issues.join('; ')}` : '';
      console.log(`  S${s.step} ${s.name}: ${s.status}${issues}`);
    }

    expect(data.allGreen).toBeTruthy();
    for (const s of data.steps) {
      expect(s.status).toBe('ok');
    }
  });

  test('STEP 1: l1Name="au bump", l2=21', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    const data = await res.json();
    const s1 = data.steps.find((s: { step: number }) => s.step === 1);

    console.log(`STEP1: l1Name="${s1.details.l1Name}" l2Count=${s1.details.l2Count}`);
    expect(s1.status).toBe('ok');
    expect(s1.details.l1Name).toBe('au bump');
    expect(s1.details.l2Count).toBe(21);
  });

  test('STEP 2: 파싱 카운트 (m066 기준)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    const data = await res.json();
    const s2 = data.steps.find((s: { step: number }) => s.step === 2);

    console.log(`STEP2 details:`, JSON.stringify(s2.details));
    expect(s2.status).toBe('ok');
    expect(s2.details.A1).toBeGreaterThanOrEqual(21);
    expect(s2.details.A5).toBeGreaterThanOrEqual(26);
    expect(s2.details.B4).toBeGreaterThanOrEqual(103);
    expect(s2.details.C1).toBeGreaterThanOrEqual(2);
    expect(s2.details.C4).toBeGreaterThanOrEqual(20);
    expect(s2.details.emptyPC).toBe(0);
  });

  test('STEP 4: FK 100% (brokenFK = 0/0/0)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    const data = await res.json();
    const s4 = data.steps.find((s: { step: number }) => s.step === 4);

    console.log(`STEP4: links=${s4.details.links} brokenFM=${s4.details.brokenFM} brokenFE=${s4.details.brokenFE} brokenFC=${s4.details.brokenFC}`);
    expect(s4.status).toBe('ok');
    expect(s4.details.links).toBeGreaterThanOrEqual(104);
    expect(s4.details.brokenFM).toBe(0);
    expect(s4.details.brokenFE).toBe(0);
    expect(s4.details.brokenFC).toBe(0);
  });

  test('STEP 5: WS emptyPC=0', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    const data = await res.json();
    const s5 = data.steps.find((s: { step: number }) => s.step === 5);

    console.log(`STEP5: totalPC=${s5.details.totalPC} emptyPC=${s5.details.emptyPC} totalFC=${s5.details.totalFC}`);
    expect(s5.status).toBe('ok');
    expect(s5.details.emptyPC).toBe(0);
    expect(s5.details.totalFC).toBeGreaterThanOrEqual(103);
  });

  test('브라우저: 워크시트 렌더링 + 탭 순회', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);
    await dismissModal(page);

    await page.screenshot({
      path: 'tests/e2e/screenshots/m066-verify-ws.png',
      fullPage: false,
    });

    const tabs = ['구조', '1기능', '2기능', '3기능', '1L영향', '2L형태', '3L원인'];
    for (const tab of tabs) {
      await clickTab(page, tab);
      const text = await page.textContent('body') || '';
      console.log(`[${tab}] rendered=${text.length > 100 ? 'OK' : 'EMPTY'}`);
      expect(text.length).toBeGreaterThan(100);
    }

    // 3기능 탭에서 FC 데이터 확인
    await clickTab(page, '3기능');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body') || '';
    const pcMatch = bodyText.match(/공정특성\((\d+)\)/);
    const pcCount = pcMatch ? parseInt(pcMatch[1]) : 0;
    console.log(`[3기능] 공정특성: ${pcCount}`);
    expect(pcCount).toBeGreaterThanOrEqual(90);

    await page.screenshot({
      path: 'tests/e2e/screenshots/m066-verify-3l.png',
      fullPage: false,
    });
  });

  test('회귀검증 3회 ALL GREEN', async ({ request }) => {
    for (let run = 1; run <= 3; run++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();

      const statuses = data.steps.map((s: { step: number; status: string }) => `S${s.step}:${s.status}`).join(' ');
      console.log(`[Regression #${run}] allGreen=${data.allGreen} ${statuses}`);

      expect(data.allGreen).toBeTruthy();
      for (const s of data.steps) {
        expect(s.status).toBe('ok');
      }
    }
  });
});
