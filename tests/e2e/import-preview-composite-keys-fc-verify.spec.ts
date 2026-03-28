/**
 * Import 미리보기: L1/L2/L3 복합키 열 + FC 탭 고장사슬 미리보기
 * @requires dev 서버 + BD에 샘플 FMEA 행 (없으면 일부 스킵)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function openImportLegacyWithOptionalFmea(page: Page) {
  page.on('dialog', async (d) => {
    await d.accept();
  });
  await page.goto(`${BASE}/pfmea/import/legacy`);
  await page.waitForLoadState('networkidle');
  await page.locator('table').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  const fmeaCell = page.locator('td:has-text("pfm26-m001-i01")').first();
  const exists = await fmeaCell.isVisible({ timeout: 8000 }).catch(() => false);
  if (exists) {
    await fmeaCell.click();
    await page.waitForLoadState('networkidle');
  } else {
    const fmeaCell2 = page.locator('td:has-text("pfm26-m002-i02")').first();
    const exists2 = await fmeaCell2.isVisible({ timeout: 5000 }).catch(() => false);
    if (exists2) {
      await fmeaCell2.click();
      await page.waitForLoadState('networkidle');
    }
  }

  const collapsed = page.locator('span:has-text("▶")').first();
  if (await collapsed.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.locator('text=기초정보 템플릿').first().click();
    await page.waitForTimeout(1500);
  }

  await expect(page.locator('button').filter({ hasText: /^L2\s/ }).first()).toBeVisible({ timeout: 25000 });
}

test.describe('Import 복합키 열 + FC 고장사슬', () => {
  test.setTimeout(90000);

  test('L1/L2/L3 미리보기에 키 열 헤더 존재', async ({ page }) => {
    await openImportLegacyWithOptionalFmea(page);

    await page.locator('button').filter({ hasText: /^L1\s/ }).first().click();
    await expect(page.locator('[data-testid="import-preview-l1"] th:has-text("C1키")').first()).toBeVisible({
      timeout: 10000,
    });

    await page.locator('button').filter({ hasText: /^L2\s/ }).first().click();
    await expect(page.locator('[data-testid="import-preview-l2"] th:has-text("A2키")').first()).toBeVisible({
      timeout: 10000,
    });

    await page.locator('button').filter({ hasText: /^L3\s/ }).first().click();
    await expect(page.locator('[data-testid="import-preview-l3"] th:has-text("B1키")').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('FC 고장사슬 탭에서 체인이 있으면 고장사슬 테이블 표시', async ({ page }) => {
    await openImportLegacyWithOptionalFmea(page);

    const fcBtn = page.locator('button').filter({ hasText: /FC 고장사슬/ }).first();
    await fcBtn.click();
    await page.waitForTimeout(500);

    const label = await fcBtn.textContent();
    const m = label?.match(/\((\d+)\)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n === 0) {
      test.skip();
      return;
    }

    await expect(page.locator('[data-testid="import-fc-chain-preview"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="import-fc-chain-preview"]')).toContainText('FE구분');
  });
});
