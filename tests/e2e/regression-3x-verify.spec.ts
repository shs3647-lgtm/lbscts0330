/**
 * @file regression-3x-verify.spec.ts
 * @description 순차회귀검증 3회 — UI + API + DB 전체 일관성 검증
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m069';
const BASE = 'http://localhost:3000';

async function dismissModal(page: any) {
  const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
  try {
    if (await okBtn.count() > 0) {
      await okBtn.first().click({ timeout: 2000 });
      await page.waitForTimeout(500);
    }
  } catch { /* no modal */ }
}

async function clickTab(page: any, label: string) {
  const btn = page.locator(`button:has-text("${label}")`);
  if (await btn.count() > 0) {
    try {
      await btn.first().click({ timeout: 5000 });
    } catch {
      await dismissModal(page);
      await btn.first().click({ timeout: 5000 });
    }
    await page.waitForTimeout(1500);
    await dismissModal(page);
  }
}

test.describe('순차회귀검증 3회 반복', () => {

  for (let run = 1; run <= 3; run++) {
    test(`회귀검증 #${run}`, async ({ page, request }) => {
      // ─── 1. UI 검증: 주요 탭 순차 클릭 ───
      await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
      await page.waitForTimeout(3000);
      await dismissModal(page);

      const tabs = ['구조(Structure)', '1기능', '2기능', '3기능', 'ALL'];
      for (const label of tabs) {
        await clickTab(page, label);
      }

      await page.screenshot({
        path: `tests/e2e/screenshots/regression-${run}-all.png`,
        fullPage: false,
      });

      const allText = await page.textContent('body');
      expect(allText?.length).toBeGreaterThan(1000);

      // ─── 2. 고장 탭 (모달 처리 포함) ───
      await clickTab(page, '2L형태');
      await clickTab(page, '고장연결');

      await page.screenshot({
        path: `tests/e2e/screenshots/regression-${run}-flink.png`,
        fullPage: false,
      });

      // ─── 3. API: Pipeline Verify ───
      const pipeRes = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
      });
      expect(pipeRes.ok()).toBeTruthy();
      const pipeData = await pipeRes.json();

      const statuses = pipeData.steps.map((s: any) => `S${s.step}:${s.status}`).join(' ');
      console.log(`[#${run}] Pipeline: allGreen=${pipeData.allGreen} ${statuses}`);
      expect(pipeData.allGreen).toBeTruthy();

      // ─── 4. DB: pipeline-detail STEP 3 + 4 ───
      const s3Res = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`);
      const s3 = await s3Res.json();
      const l2s = s3.data?.l2 || [];
      const fms = s3.data?.failureModes || [];
      const fcs = s3.data?.failureCauses || [];

      const s4Res = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=4`);
      const s4 = await s4Res.json();
      const links = s4.data?.links || [];
      const broken = links.filter((l: any) => !l.fmId || !l.feId || !l.fcId);

      const fmUnique = new Set(fms.map((f: any) => f.id)).size;

      console.log(`[#${run}] DB: L2=${l2s.length} FM=${fms.length}(u=${fmUnique}) FC=${fcs.length} Links=${links.length} Broken=${broken.length}`);

      expect(l2s.length).toBe(21);
      expect(fms.length).toBe(26);
      expect(fmUnique).toBe(26);
      expect(broken.length).toBe(0);
      expect(links.length).toBeGreaterThan(0);
      expect(fcs.length).toBeGreaterThan(0);

      console.log(`[#${run}] PASS ✓`);
    });
  }
});
