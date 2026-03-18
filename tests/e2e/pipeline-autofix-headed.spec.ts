/**
 * @file pipeline-autofix-headed.spec.ts
 * @description 브라우저 headed 모드로 파이프라인 자가검증 반복루프 실행
 *              STEP 0~5 ALL GREEN + UI 누락 0건 확인
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
    try { await btn.first().click({ timeout: 5000 }); }
    catch { await dismissModal(page); await btn.first().click({ timeout: 5000 }); }
    await page.waitForTimeout(2000);
    await dismissModal(page);
  }
}

test.describe('파이프라인 자가검증 반복루프 (headed)', () => {
  
  test('1. 자동수정 루프 실행 → ALL GREEN', async ({ request }) => {
    // POST로 자동수정 루프 실행
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    console.log(`[AutoFix] allGreen=${data.allGreen} loop=${data.loopCount}`);
    for (const s of data.steps) {
      const issues = s.issues?.length > 0 ? ` ISSUES: ${s.issues.join('; ')}` : '';
      const fixes = s.fixed?.length > 0 ? ` FIXED: ${s.fixed.join('; ')}` : '';
      console.log(`  S${s.step} ${s.name}: ${s.status}${issues}${fixes}`);
    }
    
    expect(data.allGreen).toBeTruthy();
    
    // 모든 step이 ok인지 확인
    for (const s of data.steps) {
      expect(s.status === 'ok' || s.status === 'fixed').toBeTruthy();
    }
  });

  test('2. GET 재검증 — warn/error 없이 ALL OK', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    console.log(`[Verify] allGreen=${data.allGreen}`);
    for (const s of data.steps) {
      const issues = s.issues?.length > 0 ? ` ISSUES: ${s.issues.join('; ')}` : '';
      console.log(`  S${s.step} ${s.name}: ${s.status}${issues}`);
      // STEP 2, 5에서 emptyPC가 0이어야 함
      if (s.step === 2) {
        console.log(`  [S2] emptyPC=${s.details.emptyPC}`);
        expect(s.details.emptyPC).toBe(0);
      }
      if (s.step === 5) {
        console.log(`  [S5] emptyPC=${s.details.emptyPC}`);
        expect(s.details.emptyPC).toBe(0);
      }
    }
    expect(data.allGreen).toBeTruthy();
  });

  test('3. Atomic DB L3Function.processChar 0건 empty', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`);
    const data = (await res.json()).data;
    const l3Funcs = data?.l3Functions || [];
    const emptyPc = l3Funcs.filter((f: any) => !f.processChar || !f.processChar.trim());
    
    console.log(`[Atomic] L3Function total=${l3Funcs.length}, emptyProcessChar=${emptyPc.length}`);
    if (emptyPc.length > 0) {
      emptyPc.forEach((f: any) => console.log(`  EMPTY: ${f.id} fn=${f.name?.substring(0, 40)}`));
    }
    expect(emptyPc.length).toBe(0);
  });

  test('4. 브라우저 3L기능 탭 — 누락 0건 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(4000);
    await dismissModal(page);

    // 3기능 탭 클릭
    await clickTab(page, '3기능');
    await page.waitForTimeout(2000);

    // 스크린샷
    await page.screenshot({
      path: 'c:/autom-fmea/tests/e2e/screenshots/autofix-3l-func.png',
      fullPage: false,
    });

    // "누락" 텍스트가 없어야 함
    const bodyText = await page.textContent('body') || '';
    const hasMissing = bodyText.includes('누락(Missing)');
    console.log(`[UI 3L] 누락 표시: ${hasMissing ? 'YES - FAIL' : 'NO - OK'}`);
    
    // 공정특성 카운트 확인
    const pcMatch = bodyText.match(/공정특성\((\d+)\)/);
    const funcMatch = bodyText.match(/작업요소기능\((\d+)\)/);
    if (pcMatch) console.log(`[UI 3L] 공정특성: ${pcMatch[1]}`);
    if (funcMatch) console.log(`[UI 3L] 작업요소기능: ${funcMatch[1]}`);

    expect(hasMissing).toBeFalsy();
  });

  test('5. 브라우저 전체 탭 순회 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(4000);
    await dismissModal(page);

    const tabs = ['구조', '1기능', '2기능', '3기능', '1L영향', '2L형태', '3L원인', 'ALL'];
    
    for (const tab of tabs) {
      await clickTab(page, tab);
      const text = await page.textContent('body') || '';
      const hasMissing = text.includes('누락(Missing)');
      const len = text.length;
      console.log(`[UI] ${tab}: ${len > 100 ? 'OK' : 'EMPTY'} 누락=${hasMissing ? 'YES' : 'NO'}`);
      
      await page.screenshot({
        path: `c:/autom-fmea/tests/e2e/screenshots/autofix-tab-${tab.replace(/[^a-zA-Z0-9]/g, '')}.png`,
        fullPage: false,
      });
    }
  });

  test('6. 순차회귀검증 3회 ALL GREEN', async ({ request }) => {
    for (let run = 1; run <= 3; run++) {
      const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      
      const s2emptyPC = data.steps.find((s: any) => s.step === 2)?.details?.emptyPC || 0;
      const s5emptyPC = data.steps.find((s: any) => s.step === 5)?.details?.emptyPC || 0;
      const statuses = data.steps.map((s: any) => `S${s.step}:${s.status}`).join(' ');
      
      console.log(`[Regression #${run}] allGreen=${data.allGreen} ${statuses} emptyPC(S2)=${s2emptyPC} emptyPC(S5)=${s5emptyPC}`);
      
      expect(data.allGreen).toBeTruthy();
      expect(s2emptyPC).toBe(0);
      expect(s5emptyPC).toBe(0);
    }
    console.log('[Regression] 3회 ALL GREEN + emptyPC=0 확인 완료');
  });
});
