/**
 * @file pfmea-root.spec.ts
 * @description PFMEA 단일 진입 URL (/pfmea) 리다이렉트 검증
 *
 * Policy: TEST_ENV=FULL_SYSTEM 환경에서 실행
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

test('PFMEA root: /pfmea -> /pfmea/list redirect', async ({ page }) => {
  await page.goto(`${BASE_URL}/pfmea`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/pfmea\/list(\?|$)/);
  await expect(page.locator('h1').filter({ hasText: /FMEA 리스트/i })).toBeVisible();
});



