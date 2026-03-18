/**
 * @file full-worksheet-verify.spec.ts
 * @description 워크시트 전체 탭 순차 검증 E2E 테스트
 *
 * 검증 범위:
 * 1. 3L Function (구조분석) — 공정/기능/제품특성 표시
 * 2. 3L Cause (고장연결) — FM/FE/FC 연결 표시
 * 3. ALL 탭 — 전체 고장분석 통합 화면
 * 4. 순차회귀검증 3회 반복 일관성
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m069';
const BASE = 'http://localhost:3000';

test.describe('워크시트 전체 탭 순차 검증', () => {

  test('1. 3L Function 탭 — 공정 구조 표시 검증', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    // 3L Function 탭 클릭
    const funcTab = page.locator('button', { hasText: /3L.*Func|구조분석|3L Function/ });
    if (await funcTab.count() > 0) {
      await funcTab.first().click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/verify-3l-function.png', fullPage: false });

    // 공정 행이 있는지 확인 — 테이블 내 텍스트
    const pageText = await page.textContent('body');
    
    // 최소 1개 공정이 표시되어야 함
    const hasProcess = pageText?.includes('IQA') || pageText?.includes('Sorter') || 
                       pageText?.includes('PR Coat') || pageText?.includes('작업환경');
    console.log('[3L Function] 공정 표시:', hasProcess ? 'YES' : 'NO');
    expect(hasProcess).toBeTruthy();
  });

  test('2. 3L Cause 탭 — 고장연결 표시 검증', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    // 3L Cause 탭 클릭
    const causeTab = page.locator('button', { hasText: /3L.*Cause|고장원인|3L Cause/ });
    if (await causeTab.count() > 0) {
      await causeTab.first().click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/verify-3l-cause.png', fullPage: false });

    const pageText = await page.textContent('body');
    
    // 고장원인(FC) 관련 텍스트가 표시되어야 함
    const hasFC = pageText?.includes('부적합') || pageText?.includes('측정') || 
                  pageText?.includes('오류') || pageText?.includes('작업');
    console.log('[3L Cause] 고장원인 표시:', hasFC ? 'YES' : 'NO');
    expect(hasFC).toBeTruthy();
  });

  test('3. ALL 탭 — 전체 고장분석 통합 화면 검증', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    // ALL 탭 클릭
    const allTab = page.locator('button', { hasText: /^ALL$|전체/ });
    if (await allTab.count() > 0) {
      await allTab.first().click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/verify-all-tab.png', fullPage: false });

    const pageText = await page.textContent('body');
    
    // ALL 탭에서 고장형태(FM), 고장영향(FE) 관련 데이터 확인
    const hasFM = pageText?.includes('규격') || pageText?.includes('부적합') || 
                  pageText?.includes('오인식') || pageText?.includes('Bump');
    console.log('[ALL] 고장분석 데이터 표시:', hasFM ? 'YES' : 'NO');
    expect(hasFM).toBeTruthy();
  });

  test('4. API: 파이프라인 상세 데이터 정합성 검증', async ({ request }) => {
    // STEP 3: Atomic DB 카운트 검증
    const step3 = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`);
    expect(step3.ok()).toBeTruthy();
    const s3 = await step3.json();
    
    const l2Count = s3.data?.l2?.length || s3.l2Structures?.length || 0;
    const fmData = s3.data?.failureModes || s3.failureModes || [];
    const fcData = s3.data?.failureCauses || s3.failureCauses || [];
    
    console.log(`[STEP3] L2=${l2Count}, FM=${fmData.length}, FC=${fcData.length}`);
    expect(l2Count).toBeGreaterThan(0);

    // STEP 4: FK 정합성 검증
    const step4 = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=4`);
    expect(step4.ok()).toBeTruthy();
    const s4 = await step4.json();
    
    const links = s4.data?.links || [];
    const brokenLinks = links.filter((l: any) => !l.fmId || !l.feId || !l.fcId);
    console.log(`[STEP4] Links=${links.length}, Broken=${brokenLinks.length}`);
    expect(brokenLinks.length).toBe(0);

    // STEP 5: WS 공정특성 검증
    const step5 = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=5`);
    expect(step5.ok()).toBeTruthy();
    const s5 = await step5.json();
    
    const processes = s5.data?.processes || [];
    const totalFM = processes.reduce((sum: number, p: any) => sum + (p.fmCount || 0), 0);
    const totalFC = processes.reduce((sum: number, p: any) => sum + (p.fcCount || 0), 0);
    console.log(`[STEP5] Processes=${processes.length}, FM=${totalFM}, FC=${totalFC}`);
    expect(processes.length).toBeGreaterThan(0);
    expect(totalFM).toBeGreaterThan(0);
  });

  test('5. 순차회귀검증 3회 — 일관성 확인', async ({ request }) => {
    const results: Array<{
      allGreen: boolean;
      steps: Array<{ step: number; name: string; status: string; 
        details: Record<string, number | string> }>;
    }> = [];

    for (let run = 1; run <= 3; run++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      results.push({ allGreen: data.allGreen, steps: data.steps });

      const statuses = data.steps.map((s: any) => `S${s.step}:${s.status}`).join(' ');
      console.log(`[Regression #${run}] allGreen=${data.allGreen} ${statuses}`);
    }

    // 3회 모두 allGreen 확인
    for (let i = 0; i < 3; i++) {
      expect(results[i].allGreen).toBeTruthy();
    }

    // 3회 모두 동일한 step status
    for (let step = 0; step <= 5; step++) {
      const statuses = results.map(r => r.steps.find(s => s.step === step)?.status);
      expect(statuses[0]).toBe(statuses[1]);
      expect(statuses[1]).toBe(statuses[2]);
    }

    // 3회 모두 동일한 카운트 (STEP 3 UUID)
    const s3Counts = results.map(r => {
      const s3 = r.steps.find(s => s.step === 3);
      return { L2: s3?.details.L2, FM: s3?.details.FM, FC: s3?.details.FC };
    });
    expect(s3Counts[0].L2).toBe(s3Counts[1].L2);
    expect(s3Counts[1].L2).toBe(s3Counts[2].L2);
    expect(s3Counts[0].FM).toBe(s3Counts[1].FM);
    expect(s3Counts[0].FC).toBe(s3Counts[2].FC);

    console.log('[Regression] 3회 모두 일관성 확인 ✓');
  });

});
