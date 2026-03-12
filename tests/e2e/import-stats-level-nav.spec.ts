/**
 * @file import-stats-level-nav.spec.ts
 * @description Import 통계모듈 L1/L2/L3 레벨 전환 + 데이터 표시 E2E 검증
 *
 * 검증 항목:
 *   1. L1/L2/L3 버튼 항상 클릭 가능 (disabled 아님)
 *   2. L2 클릭 → A코드 테이블 데이터 표시
 *   3. L1 클릭 → C코드 테이블 헤더 + 빈 레벨 안내
 *   4. 통계 토글 → 통계표 표시 + 레벨 컬럼 확인
 *   5. 통계표 ON + L2 전환 → 동시 표시
 *
 * @created 2026-03-13
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002-i02';

async function expandPanel(page: Page) {
  await page.goto(`${BASE}/pfmea/import/legacy?id=${FMEA_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const panelHeader = page.locator('text=기초정보 템플릿').first();
  await expect(panelHeader).toBeVisible({ timeout: 10000 });
  await panelHeader.click();
  await page.waitForTimeout(1500);
}

test.describe('Import 통계 + L1/L2/L3 레벨 전환 검증', () => {

  test('1. L1/L2/L3 버튼 항상 클릭 가능 (disabled 아님)', async ({ page }) => {
    await expandPanel(page);

    const l1Btn = page.locator('button').filter({ hasText: /^L1\s/ }).first();
    const l2Btn = page.locator('button').filter({ hasText: /^L2\s/ }).first();
    const l3Btn = page.locator('button').filter({ hasText: /^L3\s/ }).first();

    await expect(l1Btn).toBeVisible({ timeout: 5000 });
    await expect(l2Btn).toBeVisible({ timeout: 3000 });
    await expect(l3Btn).toBeVisible({ timeout: 3000 });

    await expect(l1Btn).not.toBeDisabled();
    await expect(l2Btn).not.toBeDisabled();
    await expect(l3Btn).not.toBeDisabled();

    await page.screenshot({ path: 'tests/screenshots/import-level-btns-enabled.png' });
  });

  test('2. L2 클릭 → A코드 테이블 헤더 + 데이터 행 표시', async ({ page }) => {
    await expandPanel(page);

    const l2Btn = page.locator('button').filter({ hasText: /^L2\s/ }).first();
    await expect(l2Btn).toBeVisible({ timeout: 5000 });
    await l2Btn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('th:has-text("A1 공정번호")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("A5 고장형태")').first()).toBeVisible({ timeout: 3000 });

    const dataRow = page.locator('[data-preview-level="L2"] tbody tr').first();
    await expect(dataRow).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'tests/screenshots/import-l2-data.png' });
  });

  test('3. L1 클릭 → C코드 테이블 헤더 표시 (빈 레벨이면 안내 메시지)', async ({ page }) => {
    await expandPanel(page);

    const l1Btn = page.locator('button').filter({ hasText: /^L1\s/ }).first();
    await expect(l1Btn).toBeVisible({ timeout: 5000 });
    await l1Btn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('th:has-text("C1 구분")').first()).toBeVisible({ timeout: 3000 });

    const emptyMsg = page.locator('td:has-text("L1 데이터 없음")');
    const dataRow = page.locator('[data-preview-level="L1"] tbody tr td').first();

    const hasEmpty = await emptyMsg.isVisible().catch(() => false);
    const hasData = await dataRow.isVisible().catch(() => false);
    expect(hasEmpty || hasData).toBe(true);

    await page.screenshot({ path: 'tests/screenshots/import-l1-table.png' });
  });

  test('4. 통계 토글 → 통계표 표시 + 레벨 컬럼 확인', async ({ page }) => {
    await expandPanel(page);

    const statsBtn = page.locator('button:has-text("통계")').first();
    await expect(statsBtn).toBeVisible({ timeout: 5000 });

    await statsBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('th:has-text("레벨")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("코드")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('td:has-text("합계")').first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'tests/screenshots/import-stats-on.png' });

    await statsBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('th:has-text("레벨")').first()).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'tests/screenshots/import-stats-off.png' });
  });

  test('5. 통계표 ON + L2 전환 → 통계표와 데이터 테이블 동시 표시', async ({ page }) => {
    await expandPanel(page);

    const statsBtn = page.locator('button:has-text("통계")').first();
    const l2Btn = page.locator('button').filter({ hasText: /^L2\s/ }).first();
    await expect(statsBtn).toBeVisible({ timeout: 5000 });
    await expect(l2Btn).toBeVisible({ timeout: 3000 });

    await statsBtn.click();
    await page.waitForTimeout(300);
    await l2Btn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('th:has-text("레벨")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("A1 공정번호")').first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'tests/screenshots/import-stats-with-l2.png', fullPage: true });
  });

  test('6. 통계표에 A1~C4 전체 15개 코드 표시 확인', async ({ page }) => {
    await expandPanel(page);

    const statsBtn = page.locator('button:has-text("통계")').first();
    await expect(statsBtn).toBeVisible({ timeout: 5000 });
    await statsBtn.click();
    await page.waitForTimeout(500);

    const allCodes = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4'];
    for (const code of allCodes) {
      const cell = page.locator(`td:has-text("${code}")`).first();
      await expect(cell).toBeVisible({ timeout: 3000 });
    }

    await page.screenshot({ path: 'tests/screenshots/import-stats-all-codes.png', fullPage: true });
  });

  test('7. 편집 모드에서 저장 버튼 표시 확인', async ({ page }) => {
    await expandPanel(page);

    const editBtn = page.locator('button:has-text("편집")').first();
    const isEditVisible = await editBtn.isVisible().catch(() => false);
    if (!isEditVisible) {
      test.skip(true, '편집 버튼 미표시');
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(500);

    const saveBtn = page.locator('button').filter({ hasText: /^저장$|^저장됨$|^저장중/ }).first();
    await expect(saveBtn).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'tests/screenshots/import-edit-save-btn.png' });
  });
});
