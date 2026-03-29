/**
 * PFMEA 등록 — 공정 기초정보 Excel Import 경량 모달 스모크
 * 실행: npx playwright test tests/e2e/register-basic-info-import-modal.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

test.describe('Register basic info import modal', () => {
  test('Excel Import 버튼으로 모달 오픈·닫기', async ({ page }) => {
    page.on('dialog', async (dlg) => {
      await dlg.dismiss();
    });

    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');

    const excelBtn = page.getByRole('button', { name: /Excel Import/i });
    await expect(excelBtn).toBeVisible({ timeout: 15000 });
    await excelBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /공정 기초정보 Excel Import/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /엑셀 선택/ })).toBeVisible();

    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('heading', { name: /공정 기초정보 Excel Import/ })).not.toBeVisible();
  });
});
