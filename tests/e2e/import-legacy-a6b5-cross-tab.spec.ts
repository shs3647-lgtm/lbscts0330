/**
 * @file import-legacy-a6b5-cross-tab.spec.ts
 * @description Legacy Import — 교차표(L2/L3)에 A6/B5 없음, 리스크 탭에서 PC/DC 확인
 * 실행: npx playwright test tests/e2e/import-legacy-a6b5-cross-tab.spec.ts --project=chromium --headed
 */
import { test, expect } from '@playwright/test';

test.describe('Legacy Import — PC/DC in risk tab, not L2/L3 cross-tab', () => {
  test('교차표에 A6/B5 헤더 없음 → 리스크 탭에서 예방·검출', async ({ page }) => {
    await page.goto('/pfmea/import/legacy?id=pfm26-m002', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.getByText('Import 데이터', { exact: false }).first()).toBeVisible({ timeout: 30000 });

    await page.locator('div.cursor-pointer').filter({ hasText: '기초정보' }).first().click();
    await expect(page.getByTestId('import-preview-l2')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('import-preview-l2').getByText('A6 검출관리', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /L3/ }).first().click();
    await expect(page.getByTestId('import-preview-l3')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('import-preview-l3').getByText('B5 예방관리', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: /리스크/ }).click();
    await expect(page.getByTestId('import-preview-risk-fa')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('import-preview-risk-fa').getByText('예방관리(PC)', { exact: true })).toBeVisible();
    await expect(page.getByTestId('import-preview-risk-fa').getByText('검출관리(DC)', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/import-legacy-risk-pcdc.png', fullPage: true });
  });
});
