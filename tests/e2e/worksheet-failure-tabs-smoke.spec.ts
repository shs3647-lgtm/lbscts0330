/**
 * 워크시트 고장 탭 스모크: 2L=고장형태(FM), 3L=고장원인(FC) — 용어 구분
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = process.env.PLAYWRIGHT_FMEA_ID || 'pfm26-m002';

test.describe('Worksheet failure tabs smoke', () => {
  test('failure-l2 shows 2L 고장형태(FM) header area', async ({ page }) => {
    await page.goto(
      `/pfmea/worksheet?id=${encodeURIComponent(FMEA_ID)}&tab=failure-l2`,
      { waitUntil: 'networkidle' }
    );
    await expect(page.getByText('고장형태', { exact: false }).first()).toBeVisible({ timeout: 60000 });
  });

  test('failure-l3 shows 3L 고장분석 (원인 FC) header — not "고장형태" tab', async ({ page }) => {
    await page.goto(
      `/pfmea/worksheet?id=${encodeURIComponent(FMEA_ID)}&tab=failure-l3`,
      { waitUntil: 'networkidle' }
    );
    await expect(page.getByText('3L 고장분석', { exact: false }).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('3L 구조분석', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });
});
