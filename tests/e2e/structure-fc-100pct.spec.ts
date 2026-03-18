/**
 * @file structure-fc-100pct.spec.ts
 * @description 구조분석~고장사슬 100% 일치 검증 + 3회 순차회귀
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m069';

async function dismissModal(page: any) {
  try {
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
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
    await page.waitForTimeout(2000);
    await dismissModal(page);
  }
}

test.describe('구조~고장사슬 100% 일치 검증', () => {
  test('1. API: 파이프라인 ALL GREEN', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log(`[Pipeline] allGreen=${data.allGreen} loop=${data.loopCount}`);
    for (const s of data.steps) {
      const issues = s.issues?.length > 0 ? ` ISSUES: ${s.issues.join('; ')}` : '';
      console.log(`  S${s.step} ${s.name}: ${s.status}${issues}`);
    }
    expect(data.allGreen).toBeTruthy();
  });

  test('2. API: FK 크로스레퍼런스 100%', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=4`);
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()).data;

    console.log(`[FK] Links:${data.totalLinks} FM:${data.totalFMs} FC:${data.totalFCs} FE:${data.totalFEs}`);
    console.log(`[FK] UnlinkedFC:${data.unlinkedFCs?.length} UnlinkedFM:${data.unlinkedFMs?.length} UnlinkedFE:${data.unlinkedFEs?.length}`);

    expect(data.unlinkedFCs?.length ?? 0).toBe(0);
    expect(data.unlinkedFMs?.length ?? 0).toBe(0);
    expect(data.unlinkedFEs?.length ?? 0).toBe(0);

    const brokenCount = data.links.filter((l: any) => l.broken).length;
    expect(brokenCount).toBe(0);

    // FM ID cross-ref with step 3
    const s3res = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`);
    const s3data = (await s3res.json()).data;
    const atomicFmIds = new Set((s3data.failureModes || []).map((f: any) => f.id));
    const linkFmIds = new Set(data.links.map((l: any) => l.fmId));
    let fmMismatch = 0;
    for (const fmId of linkFmIds) {
      if (!atomicFmIds.has(fmId)) fmMismatch++;
    }
    console.log(`[FK] FM cross-ref: ${linkFmIds.size}/${atomicFmIds.size} match, ${fmMismatch} miss`);
    expect(fmMismatch).toBe(0);
  });

  test('3. API: 공정별 FM/FC 커버리지', async ({ request }) => {
    const [s3res, s4res] = await Promise.all([
      request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`),
      request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=4`),
    ]);
    const s3 = (await s3res.json()).data;
    const s4 = (await s4res.json()).data;

    const l2s = s3.l2 || [];
    const fms = s3.failureModes || [];
    const fcs = s3.failureCauses || [];
    const links = s4.links || [];

    let gaps = 0;
    for (const l2 of l2s) {
      const pno = l2.processNo;
      const pFMs = fms.filter((f: any) => f.processNo === pno);
      const pFCs = fcs.filter((f: any) => f.processNo === pno);
      const pLinks = links.filter((l: any) => l.processNo === pno);
      if (pFMs.length === 0 || pFCs.length === 0 || pLinks.length === 0) {
        gaps++;
        console.log(`[GAP] ${pno} ${l2.name}: FM=${pFMs.length} FC=${pFCs.length} Links=${pLinks.length}`);
      }
    }
    console.log(`[Coverage] ${l2s.length} processes, ${gaps} gaps`);
    expect(gaps).toBe(0);
  });

  test('4. UI: 구조분석~ALL탭 브라우저 검증', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(4000);
    await dismissModal(page);

    const tabs = [
      '구조', '1기능', '2기능', '3기능',
      '1L영향', '2L형태', '3L원인',
      '고장연결', 'ALL'
    ];

    for (const tab of tabs) {
      await clickTab(page, tab);
      const text = await page.textContent('body') || '';
      const hasContent = text.length > 100;
      console.log(`[UI] ${tab}: ${hasContent ? 'OK' : 'EMPTY'} (${text.length} chars)`);
      const safeName = tab.replace(/[^a-zA-Z0-9]/g, '') || `tab${tabs.indexOf(tab)}`;
      await page.screenshot({
        path: `c:/autom-fmea/tests/e2e/screenshots/verify-100pct-${safeName}.png`,
        fullPage: false,
      });
    }
  });

  test('5. 순차회귀검증 3회 — ALL GREEN 일관성', async ({ request }) => {
    const results: Array<{ allGreen: boolean; loop: number; steps: Array<{ step: number; name: string; status: string; details: Record<string, number | string> }> }> = [];

    for (let run = 1; run <= 3; run++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      results.push({ allGreen: data.allGreen, loop: data.loopCount, steps: data.steps });

      const statuses = data.steps.map((s: any) => `S${s.step}:${s.status}`).join(' ');
      console.log(`[Regression #${run}] allGreen=${data.allGreen} loop=${data.loopCount} ${statuses}`);
    }

    // All 3 rounds must be ALL GREEN
    for (let i = 0; i < 3; i++) {
      expect(results[i].allGreen).toBeTruthy();
    }

    // All steps must be consistent across runs
    for (let step = 0; step <= 5; step++) {
      const statuses = results.map(r => r.steps.find(s => s.step === step)?.status);
      expect(statuses[0]).toBe(statuses[1]);
      expect(statuses[1]).toBe(statuses[2]);
    }

    // Step 3 counts must be identical
    const s3Counts = results.map(r => {
      const s3 = r.steps.find(s => s.step === 3);
      return { FM: s3?.details.FM, FC: s3?.details.FC, L2: s3?.details.L2, FE: s3?.details.FE };
    });
    expect(s3Counts[0].FM).toBe(s3Counts[1].FM);
    expect(s3Counts[1].FM).toBe(s3Counts[2].FM);
    expect(s3Counts[0].FC).toBe(s3Counts[1].FC);
    expect(s3Counts[0].FE).toBe(s3Counts[1].FE);

    // Step 4 link counts must be identical
    const s4Counts = results.map(r => {
      const s4 = r.steps.find(s => s.step === 4);
      return { links: s4?.details.links, unlinkedFC: s4?.details.unlinkedFC, unlinkedFM: s4?.details.unlinkedFM };
    });
    expect(s4Counts[0].links).toBe(s4Counts[1].links);
    expect(s4Counts[1].links).toBe(s4Counts[2].links);
    expect(s4Counts[0].unlinkedFC).toBe(0);
    expect(s4Counts[0].unlinkedFM).toBe(0);

    console.log('[Regression] 3회 일관성 + 100% 커버리지 확인 완료');
  });
});
