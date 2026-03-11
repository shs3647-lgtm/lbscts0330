/**
 * @file fmea-import-redirect.spec.ts
 * @description Legacy alias redirect: /fmea/import -> /pfmea/import
 *
 * Policy: TEST_ENV=FULL_SYSTEM environment
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

test('FMEA alias: /fmea/import -> /pfmea/import/legacy (preserve query)', async ({ page }) => {
  await page.goto(`${BASE_URL}/pfmea/import?id=TEST_ID`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  // 3모드 라우트 분리 이후 /pfmea/import → /pfmea/import/legacy 리다이렉트
  const url = page.url();
  expect(url).toContain('/pfmea/import/legacy');
  expect(url).toContain('id=TEST_ID');
});


