/**
 * @file cp-standard-input-modal.spec.ts
 * @description CP 워크시트 범용 입력 모달 동작 검증 테스트
 * - 드롭다운을 제외한 모든 텍스트 컬럼에서 자동 모드 클릭 시 모달 열림 확인
 */

import { test, expect } from '@playwright/test';

test.describe('CP 워크시트 범용 입력 모달', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/control-plan/worksheet?cpNo=cp26-m001');
    await page.waitForSelector('table tbody tr', { state: 'visible' });
    
    // 자동 모드로 전환
    const modeBtn = page.locator('button:has-text("수동")');
    if (await modeBtn.isVisible()) {
      await modeBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('제품특성 셀 클릭 시 모달 열림', async ({ page }) => {
    const cell = page.locator('td[data-column="productChar"]').first();
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=제품특성 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('공정특성 셀 클릭 시 모달 열림', async ({ page }) => {
    // 공정특성은 11번째 컬럼 (nth-child는 1-based)
    const cell = page.locator('table tbody tr:first-child td:nth-child(11)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=공정특성 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('스펙/공차 셀 클릭 시 모달 열림', async ({ page }) => {
    // 스펙/공차는 13번째 컬럼
    const cell = page.locator('table tbody tr:first-child td:nth-child(13)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=스펙/공차 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('평가방법 셀 클릭 시 모달 열림', async ({ page }) => {
    // 평가방법은 14번째 컬럼
    const cell = page.locator('table tbody tr:first-child td:nth-child(14)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=평가방법 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('샘플 셀 클릭 시 모달 열림', async ({ page }) => {
    // 샘플은 15번째 컬럼
    const cell = page.locator('table tbody tr:first-child td:nth-child(15)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=샘플 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('관리방법 셀 클릭 시 모달 열림', async ({ page }) => {
    // 관리방법은 17번째 컬럼
    const cell = page.locator('table tbody tr:first-child td:nth-child(17)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=관리방법 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('대응계획 셀 클릭 시 모달 열림', async ({ page }) => {
    // 대응계획은 20번째 컬럼 (마지막)
    const cell = page.locator('table tbody tr:first-child td:nth-child(20)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=대응계획 선택/입력')).toBeVisible({ timeout: 3000 });
  });

  test('모달에서 직접 입력 후 저장', async ({ page }) => {
    // 관리방법 셀 클릭
    const cell = page.locator('table tbody tr:first-child td:nth-child(17)');
    const box = await cell.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }

    // 모달이 열렸는지 확인
    await expect(page.locator('text=관리방법 선택/입력')).toBeVisible({ timeout: 3000 });

    // 직접 입력 (모달 내부의 입력 필드)
    const testValue = 'SPC관리_' + Date.now();
    const modalInput = page.locator('.fixed input[placeholder*="직접 입력"]');
    await modalInput.fill(testValue);

    // 모달 내부의 저장 버튼 클릭 (녹색 배경의 저장 버튼)
    const modalSaveBtn = page.locator('.fixed button.bg-green-600:has-text("저장")');
    await modalSaveBtn.click();

    // 모달이 닫혔는지 확인
    await expect(page.locator('text=관리방법 선택/입력')).not.toBeVisible({ timeout: 2000 });
    
    // 셀의 입력 필드에 값이 들어갔는지 확인
    const cellInput = cell.locator('input');
    await expect(cellInput).toHaveValue(testValue);
  });
});
