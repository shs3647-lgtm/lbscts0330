/**
 * @file zebra-style-inline.spec.ts
 * @description Zebra stripe rule smoke test: key worksheet tabs render body cells with inline background styles.
 *
 * This is a lightweight test (no seed data required):
 * - Verifies that the first body row in each target tab has inline style containing background.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = `${process.env.TEST_BASE_URL ?? 'http://localhost:3001'}/pfmea/worksheet?id=${encodeURIComponent(
  process.env.TEST_FMEA_ID ?? 'PFM26-001'
)}`;

async function expectFirstBodyCellHasInlineBackground(page: any) {
  const firstCell = page.locator('tbody tr td').first();
  await expect(firstCell).toBeVisible({ timeout: 15000 });
  const styleAttr = await firstCell.getAttribute('style');
  expect(styleAttr || '').toContain('background');
}

test.describe('Zebra stripe inline style smoke', () => {
  test('FunctionL1 / FunctionL2 / FailureL2 / FailureL3 placeholders use inline background', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    // tab menu가 렌더될 때까지 대기 (초기 컴파일 지연 대비)
    await expect(page.locator('button:has-text("구조분석")').first()).toBeVisible({ timeout: 45000 });

    // 1L 기능
    await page.locator('button:has-text("1L기능")').first().scrollIntoViewIfNeeded();
    await page.locator('button:has-text("1L기능")').first().click({ timeout: 45000 });
    await page.waitForTimeout(300);
    await expectFirstBodyCellHasInlineBackground(page);

    // 2L 기능
    await page.locator('button:has-text("2L기능")').first().scrollIntoViewIfNeeded();
    await page.locator('button:has-text("2L기능")').first().click({ timeout: 45000 });
    await page.waitForTimeout(300);
    await expectFirstBodyCellHasInlineBackground(page);

    // 2L 형태
    await page.locator('button:has-text("2L형태")').first().scrollIntoViewIfNeeded();
    await page.locator('button:has-text("2L형태")').first().click({ timeout: 45000 });
    await page.waitForTimeout(300);
    await expectFirstBodyCellHasInlineBackground(page);

    // 3L 원인
    await page.locator('button:has-text("3L원인")').first().scrollIntoViewIfNeeded();
    await page.locator('button:has-text("3L원인")').first().click({ timeout: 45000 });
    await page.waitForTimeout(300);
    await expectFirstBodyCellHasInlineBackground(page);

    // 1L 영향 (완제품공정명/완제품기능 rowSpan도 inline background가 있어야 함)
    await page.locator('button:has-text("1L영향")').first().scrollIntoViewIfNeeded();
    await page.locator('button:has-text("1L영향")').first().click({ timeout: 45000 });
    await page.waitForTimeout(300);
    await expectFirstBodyCellHasInlineBackground(page);
  });
});


