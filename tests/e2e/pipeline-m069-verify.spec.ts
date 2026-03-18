/**
 * @file pipeline-m069-verify.spec.ts
 * @description pfm26-m069 파이프라인 검증 — STEP 2 A6/B5 + STEP 6 AP 불일치 수정 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m069';

test.describe('pfm26-m069 파이프라인 검증', () => {

  test('API: STEP 2 A6/B5 일치 + STEP 6 apMismatch=0', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    for (const s of data.steps) {
      console.log(`STEP ${s.step} ${s.name}: ${s.status}`);
      if (s.issues?.length) s.issues.forEach((i: string) => console.log(`  - ${i}`));
      if (s.fixed?.length) s.fixed.forEach((f: string) => console.log(`  [fix] ${f}`));
    }

    expect(data.allGreen).toBeTruthy();

    // STEP 2: A6/B5 Atomic vs Legacy 일치
    const s2 = data.steps.find((s: any) => s.step === 2);
    expect(s2).toBeDefined();
    console.log(`STEP2: atm_A6=${s2.details.atm_A6} leg_A6=${s2.details.leg_A6}`);
    console.log(`STEP2: atm_B5=${s2.details.atm_B5} leg_B5=${s2.details.leg_B5}`);
    expect(s2.details.atm_A6).toBe(s2.details.leg_A6);
    expect(s2.details.atm_B5).toBe(s2.details.leg_B5);

    // STEP 6: AP 불일치 0건
    const s6 = data.steps.find((s: any) => s.step === 6);
    expect(s6).toBeDefined();
    console.log(`STEP6: apMismatch=${s6.details.apMismatch} optimizations=${s6.details.optimizations}`);
    expect(s6.details.apMismatch).toBe(0);
    expect(s6.details.hWithoutOpt).toBe(0);
  });

  test('API: 회귀검증 3회 연속 ALL GREEN', async ({ request }) => {
    for (let i = 1; i <= 3; i++) {
      const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
      const data = await res.json();
      const statuses = data.steps.map((s: any) => `S${s.step}:${s.status}`).join(' ');
      console.log(`[Regression #${i}] allGreen=${data.allGreen} ${statuses}`);

      const s6 = data.steps.find((s: any) => s.step === 6);
      console.log(`  apMismatch=${s6?.details?.apMismatch}`);
      expect(data.allGreen).toBeTruthy();
      expect(s6?.details?.apMismatch).toBe(0);
    }
  });

  test('브라우저: 워크시트 로드 + Verify 버튼 + STEP 6 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);

    // 모달 닫기
    try {
      const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
      if (await okBtn.count() > 0) await okBtn.first().click({ timeout: 2000 });
    } catch { /* no modal */ }
    await page.waitForTimeout(1000);

    // Verify 버튼 클릭
    const verifyBtn = page.locator('button:has-text("Verify")');
    if (await verifyBtn.count() > 0) {
      await verifyBtn.first().click({ timeout: 5000 });
      await page.waitForTimeout(3000);
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/pipeline-m069-step6.png',
      fullPage: false,
    });

    const bodyText = await page.textContent('body') || '';
    console.log('Body includes STEP 6:', bodyText.includes('STEP 6'));
    console.log('Body includes OPT:', bodyText.includes('OPT'));
  });
});
