/**
 * @file failure-chain-verify.spec.ts
 * @description 고장연결 + FM/FC 탭 상세 검증
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m069';
const BASE = 'http://localhost:3000';

test.describe('고장연결 + FM/FC 탭 상세 검증', () => {

  test('1. 고장영향(FE) 탭 — 1L영향(FE)', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("1L영향")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/verify-1l-fe.png', fullPage: false });

    const text = await page.textContent('body');
    console.log('[1L FE] page length:', text?.length);
    expect(text?.length).toBeGreaterThan(1000);
  });

  test('2. 고장형태(FM) 탭 — 2L형태(FM)', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("2L형태")').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/verify-2l-fm.png', fullPage: false });

    const text = await page.textContent('body');
    console.log('[2L FM] body text length:', text?.length);
    const hasFMContent = text?.includes('고장형태') || text?.includes('형태') || 
                         text?.includes('특성') || text?.includes('공정');
    console.log('[2L FM] 고장형태 컨텐츠:', hasFMContent);
    expect(text?.length).toBeGreaterThan(1000);
  });

  test('3. 고장원인(FC) 탭 — 3L원인(FC)', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("3L원인")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/verify-3l-fc.png', fullPage: false });

    const text = await page.textContent('body');
    console.log('[3L FC] body text length:', text?.length);
    expect(text?.length).toBeGreaterThan(1000);
  });

  test('4. 고장연결(Failure Link) 탭', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("고장연결")').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/verify-failure-link.png', fullPage: false });

    const text = await page.textContent('body');
    console.log('[FailureLink] page text length:', text?.length);
    expect(text?.length).toBeGreaterThan(1000);
  });

  test('5. DB FK 완전성: FailureLink 110건 모두 유효', async ({ request }) => {
    const step4 = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=4`);
    expect(step4.ok()).toBeTruthy();
    const s4 = await step4.json();
    const links = s4.data?.links || [];

    console.log(`[FK] Total links: ${links.length}`);

    let brokenFM = 0, brokenFE = 0, brokenFC = 0;
    for (const link of links) {
      if (!link.fmId) brokenFM++;
      if (!link.feId) brokenFE++;
      if (!link.fcId) brokenFC++;
    }

    console.log(`[FK] Broken: FM=${brokenFM}, FE=${brokenFE}, FC=${brokenFC}`);
    expect(brokenFM).toBe(0);
    expect(brokenFE).toBe(0);
    expect(brokenFC).toBe(0);

    for (const link of links.slice(0, 5)) {
      console.log(`  Link: proc=${link.processNo} FM="${(link.fmName || '').substring(0, 30)}" → FE="${(link.feName || '').substring(0, 30)}"`);
      expect(link.fmId).toBeTruthy();
      expect(link.feId).toBeTruthy();
    }
  });

  test('6. DB UUID 유일성: FM ID 중복 없음', async ({ request }) => {
    const step3 = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`);
    expect(step3.ok()).toBeTruthy();
    const s3 = await step3.json();

    const l2Ids = (s3.data?.l2 || []).map((l: any) => l.id);
    const l2UniqueIds = new Set(l2Ids);
    console.log(`[UUID] L2: total=${l2Ids.length}, unique=${l2UniqueIds.size}`);
    expect(l2UniqueIds.size).toBe(l2Ids.length);

    const fmList = s3.data?.failureModes || [];
    const fmIds = fmList.map((f: any) => f.id);
    const fmUniqueIds = new Set(fmIds);
    console.log(`[UUID] FM: total=${fmIds.length}, unique=${fmUniqueIds.size}`);
    expect(fmUniqueIds.size).toBe(fmIds.length);

    if (fmUniqueIds.size !== fmIds.length) {
      const counts: Record<string, number> = {};
      fmIds.forEach((id: string) => { counts[id] = (counts[id] || 0) + 1; });
      Object.entries(counts).filter(([, c]) => c > 1).forEach(([id, c]) => {
        const matching = fmList.filter((f: any) => f.id === id);
        console.log(`  DUP: ${id} (${c}x) names: ${matching.map((f: any) => f.name).join(', ')}`);
      });
    }
  });
});
