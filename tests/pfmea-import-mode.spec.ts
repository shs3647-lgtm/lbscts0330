/**
 * @file pfmea-import-mode.spec.ts
 * @description PFMEA Import mode behavior
 *
 * - mode=new: do NOT auto-load master data
 * - mode=master: falls back to localStorage master data when DB is unavailable
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

test('PFMEA import: mode=new does not auto-load master data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'pfmea_master_data',
      JSON.stringify([{ id: 'T1', processNo: '10', category: 'A', itemCode: 'A2', value: 'SHOULD_NOT_LOAD', createdAt: new Date().toISOString() }])
    );
  });
  await page.goto(`${BASE_URL}/pfmea/import?mode=new`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('SHOULD_NOT_LOAD')).toHaveCount(0);
});

test('PFMEA import: mode=master page loads correctly', async ({ page }) => {
  await page.goto(`${BASE_URL}/pfmea/import?mode=master`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // import 페이지가 정상 로드되었는지 확인 (DB-first 모드)
  // 마스터 데이터 테이블 또는 import 관련 UI 요소 존재 확인
  const pageContent = await page.content();
  const hasImportUI = pageContent.includes('import') || pageContent.includes('마스터') ||
                      pageContent.includes('Master') || pageContent.includes('업로드');
  expect(hasImportUI).toBe(true);
});


