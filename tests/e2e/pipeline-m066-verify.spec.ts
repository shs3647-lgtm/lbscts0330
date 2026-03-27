/**
 * @file pipeline-m066-verify.spec.ts
 * @description 파이프라인 0~4단계 검증 (현재 API 구조 대응)
 *
 * API 응답 구조 (2026-03-27):
 *   Step 0 (구조): l1, l1Name, l2, l3, l1F
 *   Step 1 (UUID): L2, L3, FM, FE, FC, FL, RA, duplicateUUIDs, emptyProcessChar
 *   Step 2 (fmeaId): l1Structure~riskAnalysis (11개 테이블 fmeaId 정합)
 *   Step 3 (FK): links, unlinkedFC/FM, totalFM/FC/FE/RA, totalOrphans
 *   Step 4 (누락): totalPC, emptyPC, orphanPC, nullDC/PC, missS/O/D
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';

interface PipelineStep {
  step: number;
  name: string;
  status: string;
  details: Record<string, number | string>;
  issues: string[];
}

interface PipelineResponse {
  success: boolean;
  fmeaId: string;
  steps: PipelineStep[];
  allGreen: boolean;
  loopCount: number;
}

async function fetchPipeline(request: import('@playwright/test').APIRequestContext): Promise<PipelineResponse> {
  const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

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

test.describe('파이프라인 0~4단계 검증', () => {

  test('API 응답 구조 검증 (5개 step, 필수 필드 존재)', async ({ request }) => {
    const data = await fetchPipeline(request);
    expect(data.success).toBe(true);
    expect(data.fmeaId).toBe(FMEA_ID);
    expect(data.steps).toHaveLength(5);

    const stepNames = data.steps.map(s => s.step);
    expect(stepNames).toEqual([0, 1, 2, 3, 4]);

    for (const s of data.steps) {
      expect(s).toHaveProperty('status');
      expect(s).toHaveProperty('details');
      expect(s).toHaveProperty('issues');
      const issues = s.issues?.length > 0 ? ` ISSUES: ${s.issues.join('; ')}` : '';
      console.log(`  S${s.step} ${s.name}: ${s.status}${issues}`);
    }
  });

  test('Step 0 (구조): l1, l2, l3 필드 존재', async ({ request }) => {
    const data = await fetchPipeline(request);
    const s0 = data.steps.find(s => s.step === 0)!;
    expect(s0).toBeDefined();
    expect(s0.details).toHaveProperty('l1');
    expect(s0.details).toHaveProperty('l2');
    expect(s0.details).toHaveProperty('l3');
    expect(s0.details).toHaveProperty('l1Name');
    console.log(`Step0: l1=${s0.details.l1} l2=${s0.details.l2} l3=${s0.details.l3} l1Name="${s0.details.l1Name}"`);
  });

  test('Step 1 (UUID): 엔티티 카운트 필드 존재', async ({ request }) => {
    const data = await fetchPipeline(request);
    const s1 = data.steps.find(s => s.step === 1)!;
    expect(s1).toBeDefined();

    const requiredFields = ['L2', 'L3', 'FM', 'FE', 'FC', 'FL', 'RA', 'duplicateUUIDs'];
    for (const f of requiredFields) {
      expect(s1.details).toHaveProperty(f);
    }

    console.log(`Step1: FM=${s1.details.FM} FE=${s1.details.FE} FC=${s1.details.FC} FL=${s1.details.FL} RA=${s1.details.RA}`);
    expect(Number(s1.details.duplicateUUIDs)).toBe(0);
  });

  test('Step 2 (fmeaId): 11개 테이블 정합 검증', async ({ request }) => {
    const data = await fetchPipeline(request);
    const s2 = data.steps.find(s => s.step === 2)!;
    expect(s2).toBeDefined();
    expect(s2.status).toBe('ok');

    expect(s2.details).toHaveProperty('tablesChecked');
    expect(Number(s2.details.tablesChecked)).toBeGreaterThanOrEqual(11);
    expect(Number(s2.details.totalMismatch)).toBe(0);

    console.log(`Step2: tables=${s2.details.tablesChecked} records=${s2.details.totalRecords} mismatch=${s2.details.totalMismatch}`);
  });

  test('Step 3 (FK): orphan=0, unlinked 검증', async ({ request }) => {
    const data = await fetchPipeline(request);
    const s3 = data.steps.find(s => s.step === 3)!;
    expect(s3).toBeDefined();
    expect(s3.status).toBe('ok');

    expect(Number(s3.details.totalOrphans)).toBe(0);
    console.log(`Step3: links=${s3.details.links} orphans=${s3.details.totalOrphans} unlinkedFC=${s3.details.unlinkedFC} unlinkedFM=${s3.details.unlinkedFM}`);
  });

  test('Step 4 (누락): emptyPC=0, orphanPC=0', async ({ request }) => {
    const data = await fetchPipeline(request);
    const s4 = data.steps.find(s => s.step === 4)!;
    expect(s4).toBeDefined();
    expect(s4.status).toBe('ok');

    expect(Number(s4.details.emptyPC)).toBe(0);
    expect(Number(s4.details.orphanPC)).toBe(0);
    expect(Number(s4.details.raDuplicates)).toBe(0);

    console.log(`Step4: totalPC=${s4.details.totalPC} emptyPC=${s4.details.emptyPC} orphanPC=${s4.details.orphanPC} nullDC=${s4.details.nullDC} nullPC=${s4.details.nullPC}`);
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

    await page.screenshot({
      path: 'tests/e2e/screenshots/m066-verify-3l.png',
      fullPage: false,
    });
  });

  test('회귀검증 3회 일관성', async ({ request }) => {
    const results: boolean[] = [];
    for (let run = 1; run <= 3; run++) {
      const data = await fetchPipeline(request);
      const statuses = data.steps.map(s => `S${s.step}:${s.status}`).join(' ');
      console.log(`[Regression #${run}] allGreen=${data.allGreen} ${statuses}`);
      results.push(data.allGreen);
    }
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });
});
