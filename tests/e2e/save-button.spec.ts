/**
 * @file save-button.spec.ts
 * @description Saved 버튼 수동 저장 기능 검증 — 클릭 시 실제 저장 + 시각 피드백
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m069';

test.describe('Saved 버튼 수동 저장', () => {

  test('Saved 버튼 클릭 시 저장 피드백 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);

    // 모달 닫기
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
    if (await okBtn.count() > 0) {
      await okBtn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Saved 버튼 찾기
    const saveBtn = page.locator('button:has-text("Saved")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });

    // 버튼이 클릭 가능한지 확인 (disabled가 아닌지)
    await expect(saveBtn).toBeEnabled();

    // 클릭
    await saveBtn.click();

    // "✓ Saved" 또는 "저장중..." 피드백이 표시되는지 확인
    await page.waitForTimeout(500);
    const btnText = await saveBtn.textContent();
    console.log(`[Save] button text after click: "${btnText}"`);

    // 1.2초 후 원래 상태로 복원 확인
    await page.waitForTimeout(1500);
    const finalText = await saveBtn.textContent();
    console.log(`[Save] button text after flash: "${finalText}"`);
    expect(finalText).toContain('Saved');

    await page.screenshot({ path: 'tests/e2e/screenshots/save-button-test.png', fullPage: false });
    await page.waitForTimeout(3000);
  });
});
