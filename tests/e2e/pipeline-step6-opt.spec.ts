/**
 * @file pipeline-step6-opt.spec.ts
 * @description Step 6 OPT(최적화) 파이프라인 검증 — API + 브라우저 UI (3초 대기, 순차 회귀)
 *
 * 검증 항목:
 * 1. API: Step 6 OPT가 응답에 포함되어야 함
 * 2. API: 12개 검증 항목 (fmeaId/UUID/FK/WS/커버리지/SOD/AP 등)
 * 3. UI: STEP 6 OPT가 시각적으로 표시되어야 함
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m069';

test.describe('Step 6 OPT 파이프라인 검증', () => {

  test('API: Step 6 OPT가 응답에 포함', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBeTruthy();

    // 7개 단계(0~6) 존재
    expect(data.steps.length).toBe(7);

    // Step 6 OPT 존재
    const s6 = data.steps.find((s: { step: number }) => s.step === 6);
    expect(s6).toBeTruthy();
    expect(s6.name).toBe('OPT');

    // 필수 details 필드 존재
    expect(s6.details).toHaveProperty('failureLinks');
    expect(s6.details).toHaveProperty('riskAnalyses');
    expect(s6.details).toHaveProperty('optimizations');

    console.log(`[Step 6 OPT] status=${s6.status}, FL=${s6.details.failureLinks}, RA=${s6.details.riskAnalyses}, Opt=${s6.details.optimizations}`);
    if (s6.issues?.length) s6.issues.forEach((i: string) => console.log(`  issue: ${i}`));
  });

  test('API: Step 6 FK 무결성 항목 포함', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const data = await res.json();
    const s6 = data.steps.find((s: { step: number }) => s.step === 6);
    expect(s6).toBeTruthy();

    // fkIntegrity 배열 존재 + 2개 관계 (Opt→RA, RA→FL)
    expect(s6.fkIntegrity).toBeDefined();
    expect(s6.fkIntegrity.length).toBeGreaterThanOrEqual(2);

    const optRA = s6.fkIntegrity.find((f: { relation: string }) => f.relation.includes('Opt.riskId'));
    expect(optRA).toBeTruthy();
    console.log(`  FK Opt→RA: total=${optRA.total}, valid=${optRA.valid}, orphans=${optRA.orphans.length}`);

    const raFL = s6.fkIntegrity.find((f: { relation: string }) => f.relation.includes('RA.linkId'));
    expect(raFL).toBeTruthy();
    console.log(`  FK RA→FL: total=${raFL.total}, valid=${raFL.valid}, orphans=${raFL.orphans.length}`);
  });

  test('UI: STEP 6 OPT가 파이프라인 패널에 표시됨', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);

    // 모달 닫기
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
    if (await okBtn.count() > 0) {
      await okBtn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Pipeline Verify 버튼 클릭 (data-testid)
    const verifyBtn = page.locator('[data-testid="verify-pipeline-button"]');
    await expect(verifyBtn).toBeVisible({ timeout: 10000 });
    await verifyBtn.click();
    await page.waitForTimeout(3000);

    // 파이프라인 패널이 열렸는지 확인
    const panel = page.locator('[data-testid="pipeline-verify-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // STEP 6 버튼이 파이프라인 흐름도에 존재하는지 확인
    const step6Btn = panel.getByRole('button', { name: /STEP 6/ });
    await expect(step6Btn).toBeVisible({ timeout: 5000 });

    // 버튼 내 OPT 텍스트 확인
    await expect(step6Btn).toContainText('OPT');

    await page.screenshot({ path: 'tests/e2e/screenshots/pipeline-step6-opt.png', fullPage: false });
    await page.waitForTimeout(3000);
  });
});
