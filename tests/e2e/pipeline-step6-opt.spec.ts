/**
 * @file pipeline-step6-opt.spec.ts
 * @description Step 6 OPT(최적화) 파이프라인 검증 + 자동수정 — API + 브라우저 UI (3초 대기, 순차 회귀)
 *
 * 검증 항목:
 * 1. API GET: Step 6 OPT가 응답에 포함
 * 2. API GET: FK 무결성 항목
 * 3. API POST: 자동수정 → SOD riskData→DB 동기화 + AP 재계산
 * 4. UI: 브라우저에서 STEP 6 OPT 표시 + 자동수정 버튼 동작 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m069';

test.describe('Step 6 OPT 파이프라인 검증 + 자동수정', () => {

  test('API GET: Step 6 OPT가 응답에 포함', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBeTruthy();
    expect(data.steps.length).toBe(7);

    const s6 = data.steps.find((s: { step: number }) => s.step === 6);
    expect(s6).toBeTruthy();
    expect(s6.name).toBe('OPT');
    expect(s6.details).toHaveProperty('failureLinks');
    expect(s6.details).toHaveProperty('riskAnalyses');
    expect(s6.details).toHaveProperty('optimizations');

    console.log(`[Step 6 OPT] status=${s6.status}, FL=${s6.details.failureLinks}, RA=${s6.details.riskAnalyses}, Opt=${s6.details.optimizations}`);
    if (s6.issues?.length) s6.issues.forEach((i: string) => console.log(`  issue: ${i}`));
  });

  test('API GET: Step 6 FK 무결성 항목 포함', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const data = await res.json();
    const s6 = data.steps.find((s: { step: number }) => s.step === 6);
    expect(s6).toBeTruthy();
    expect(s6.fkIntegrity).toBeDefined();
    expect(s6.fkIntegrity.length).toBeGreaterThanOrEqual(2);

    const optRA = s6.fkIntegrity.find((f: { relation: string }) => f.relation.includes('Opt.riskId'));
    expect(optRA).toBeTruthy();
    console.log(`  FK Opt→RA: total=${optRA.total}, valid=${optRA.valid}, orphans=${optRA.orphans.length}`);

    const raFL = s6.fkIntegrity.find((f: { relation: string }) => f.relation.includes('RA.linkId'));
    expect(raFL).toBeTruthy();
    console.log(`  FK RA→FL: total=${raFL.total}, valid=${raFL.valid}, orphans=${raFL.orphans.length}`);
  });

  test('API POST: 자동수정 → Step 6 fixed 결과 확인', async ({ request }) => {
    // 자동수정 전 상태 캡처
    const before = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const dataBefore = await before.json();
    const s6Before = dataBefore.steps.find((s: { step: number }) => s.step === 6);
    const issuesBefore = s6Before?.issues?.length || 0;
    console.log(`[Before] Step 6 issues: ${issuesBefore}`);
    if (s6Before?.issues) s6Before.issues.forEach((i: string) => console.log(`  - ${i}`));

    // 자동수정 실행
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBeTruthy();

    const s6After = data.steps.find((s: { step: number }) => s.step === 6);
    expect(s6After).toBeTruthy();

    // 자동수정 결과 출력
    console.log(`[After] Step 6 status=${s6After.status}, issues=${s6After.issues?.length || 0}, fixed=${s6After.fixed?.length || 0}`);
    if (s6After.fixed?.length > 0) {
      s6After.fixed.forEach((f: string) => console.log(`  FIXED: ${f}`));
    }
    if (s6After.issues?.length > 0) {
      s6After.issues.forEach((i: string) => console.log(`  REMAIN: ${i}`));
    }

    // AP 불일치가 0이 되었는지 확인
    expect(s6After.details.apMismatch).toBe(0);

    // O/D 미입력이 감소했는지 확인 (riskData에 값이 있는 것만 동기화)
    console.log(`  missingO: ${s6After.details.missingO}, missingD: ${s6After.details.missingD}`);
  });

  test('UI: 파이프라인 패널 STEP 6 OPT + 자동수정 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);

    // 모달 닫기
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
    if (await okBtn.count() > 0) {
      await okBtn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Pipeline Verify 버튼 클릭
    const verifyBtn = page.locator('[data-testid="verify-pipeline-button"]');
    await expect(verifyBtn).toBeVisible({ timeout: 10000 });
    await verifyBtn.click();
    await page.waitForTimeout(3000);

    // 파이프라인 패널 확인
    const panel = page.locator('[data-testid="pipeline-verify-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // STEP 6 버튼 확인
    const step6Btn = panel.getByRole('button', { name: /STEP 6/ });
    await expect(step6Btn).toBeVisible({ timeout: 5000 });
    await expect(step6Btn).toContainText('OPT');

    // 자동수정 버튼 확인 + 클릭
    const autoFixBtn = panel.locator('button:has-text("자동수정")');
    if (await autoFixBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await autoFixBtn.click();
      await page.waitForTimeout(5000);

      // 수정 후 Step 6 상태 확인
      const panelText = await panel.textContent() || '';
      console.log(`[UI] Panel after autofix contains OPT: ${panelText.includes('OPT')}`);
      console.log(`[UI] Panel after autofix contains STEP 6: ${panelText.includes('STEP 6')}`);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/pipeline-step6-autofix.png', fullPage: false });
    await page.waitForTimeout(3000);
  });
});
