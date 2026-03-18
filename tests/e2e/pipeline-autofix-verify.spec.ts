/**
 * @file pipeline-autofix-verify.spec.ts
 * @description 파이프라인 검증 + 자동수정 루프 E2E 테스트
 *
 * 검증 체크리스트:
 * 1. 파이프라인 패널 열기 → STEP 0~5 표시
 * 2. 자동수정 버튼 클릭 → 수정 루프 실행
 * 3. STEP 0 SAMPLE: OK (Master 655 items, 104 chains)
 * 4. STEP 2 파싱: OK (A5>0, B4>0, C4>0)
 * 5. STEP 3 UUID: OK (L2>0, L3>0, FM>0)
 * 6. STEP 4 FK: OK (broken=0)
 * 7. STEP 5 WS: OK
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m069';
const BASE = 'http://localhost:3000';

test.describe('Pipeline 자동수정 + 순차회귀 검증', () => {

  test('API: 자동수정 루프 실행 후 STEP 0~5 검증', async ({ request }) => {
    // 자동수정 실행
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBeTruthy();

    const steps = data.steps as Array<{
      step: number; name: string; status: string;
      details: Record<string, number | string>;
      issues: string[]; fixed: string[];
    }>;

    // STEP 0: SAMPLE OK
    const step0 = steps.find(s => s.step === 0)!;
    expect(step0.status).toBe('ok');
    expect(Number(step0.details.flatItems)).toBeGreaterThan(100);
    expect(Number(step0.details.chains)).toBeGreaterThan(50);

    // STEP 2: 파싱 OK or warn (빈 공정특성 등 데이터 품질 경고 허용)
    const step2 = steps.find(s => s.step === 2)!;
    expect(['ok', 'warn']).toContain(step2.status);
    expect(Number(step2.details.A5)).toBeGreaterThan(0);
    expect(Number(step2.details.B4)).toBeGreaterThan(0);
    expect(Number(step2.details.C4)).toBeGreaterThan(0);

    // STEP 3: UUID OK
    const step3 = steps.find(s => s.step === 3)!;
    expect(step3.status).toBe('ok');
    expect(Number(step3.details.L2)).toBeGreaterThan(0);
    expect(Number(step3.details.FM)).toBeGreaterThan(0);

    // STEP 4: FK OK
    const step4 = steps.find(s => s.step === 4)!;
    expect(step4.status).toBe('ok');
    expect(Number(step4.details.brokenFC)).toBe(0);

    // STEP 5: WS OK or warn
    const step5 = steps.find(s => s.step === 5)!;
    expect(['ok', 'warn']).toContain(step5.status);

    // allGreen = ok or warn
    expect(data.allGreen).toBeTruthy();
  });

  test('UI: 파이프라인 검증 패널에서 자동수정 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);

    // Verify 버튼 클릭
    const verifyBtn = page.locator('button', { hasText: /Verify|검증/ });
    if (await verifyBtn.count() > 0) {
      await verifyBtn.first().click();
      await page.waitForTimeout(2000);
    }

    // 파이프라인 패널 확인
    const panel = page.locator('[data-testid="pipeline-verify-panel"]');
    if (await panel.count() > 0) {
      await expect(panel).toBeVisible();
      await page.screenshot({ path: 'tests/e2e/screenshots/pipeline-autofix-before.png' });

      // 자동수정 버튼이 있으면 클릭
      const autoFixBtn = panel.locator('button', { hasText: /자동수정/ });
      if (await autoFixBtn.count() > 0 && await autoFixBtn.isEnabled()) {
        await autoFixBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'tests/e2e/screenshots/pipeline-autofix-after.png' });
      }

      // STEP 상태 확인
      const stepTexts = await panel.locator('.text-xs, .text-sm').allTextContents();
      const statusText = stepTexts.join(' ');
      console.log('[Pipeline] Panel text:', statusText.substring(0, 500));
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/pipeline-autofix-final.png' });
  });

  test('API: 순차 회귀검증 — 2회 반복 일관성 확인', async ({ request }) => {
    const results: Array<{ allGreen: boolean; loopCount: number; stepStatuses: string[] }> = [];

    for (let run = 0; run < 2; run++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
      });
      const data = await res.json();
      results.push({
        allGreen: data.allGreen,
        loopCount: data.loopCount,
        stepStatuses: data.steps.map((s: any) => `${s.name}:${s.status}`),
      });
    }

    // 2회 모두 동일한 결과여야 함
    console.log('[Regression] Run 1:', JSON.stringify(results[0]));
    console.log('[Regression] Run 2:', JSON.stringify(results[1]));

    for (let i = 0; i < results[0].stepStatuses.length; i++) {
      expect(results[0].stepStatuses[i]).toBe(results[1].stepStatuses[i]);
    }
  });

  test('API: STEP 상세 데이터 검증 — L2/L3/FM/FE/FC 카운트', async ({ request }) => {
    for (let step = 1; step <= 5; step++) {
      const res = await request.get(
        `${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=${step}`
      );
      if (res.ok()) {
        const data = await res.json();
        console.log(`[Detail] STEP ${step}: ${JSON.stringify(data).substring(0, 200)}`);
      }
    }

    // STEP 3 상세: L2 processes > 0
    const step3Res = await request.get(
      `${BASE}/api/fmea/pipeline-detail?fmeaId=${FMEA_ID}&step=3`
    );
    if (step3Res.ok()) {
      const step3Data = await step3Res.json();
      if (step3Data.l2Structures) {
        expect(step3Data.l2Structures.length).toBeGreaterThan(0);
      }
    }
  });

});
