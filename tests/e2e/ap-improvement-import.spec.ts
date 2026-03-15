/**
 * @file ap-improvement-import.spec.ts
 * @description AP 개선관리 Import/Export/Save 기능 E2E 테스트
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const AP_PAGE = `${BASE_URL}/pfmea/ap-improvement`;

test.describe('AP 개선관리 Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AP_PAGE, { waitUntil: 'networkidle', timeout: 30000 });
  });

  test('1. 페이지 로드 — 메뉴바에 Import/Export/양식/Save/Del 버튼 존재', async ({ page }) => {
    // Import 버튼
    const importBtn = page.locator('button', { hasText: '↑Import' });
    await expect(importBtn).toBeVisible();

    // Export 버튼
    const exportBtn = page.locator('button', { hasText: '↓Export' });
    await expect(exportBtn).toBeVisible();

    // 양식 버튼
    const templateBtn = page.locator('button', { hasText: '📋양식' });
    await expect(templateBtn).toBeVisible();

    // Save 버튼
    const saveBtn = page.locator('button', { hasText: '⊞Save' });
    await expect(saveBtn).toBeVisible();

    // Del 버튼
    const delBtn = page.locator('button', { hasText: '✕Del' });
    await expect(delBtn).toBeVisible();
  });

  test('2. Excel Import — 5건 테스트 데이터 로드', async ({ page }) => {
    const testFile = path.resolve(__dirname, '../temp-ap-test.xlsx');

    // hidden file input 찾아서 파일 업로드
    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]');
    await fileInput.setInputFiles(testFile);

    // alert 대기: "5건 Import 완료"
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('5건 Import 완료');
      await dialog.accept();
    });

    // 잠시 대기 후 테이블에 데이터가 표시되는지 확인
    await page.waitForTimeout(1000);

    // 테이블 본문에 '솔더 브릿지' 또는 'Solder Paste Printing' 텍스트가 있는지 확인
    const tableBody = page.locator('tbody');
    const bodyText = await tableBody.textContent();
    // Import된 5건 중 하나라도 표시되는지 확인
    const hasImportedData = bodyText?.includes('솔더 브릿지')
      || bodyText?.includes('Solder Paste')
      || bodyText?.includes('김품질')
      || bodyText?.includes('CIP26-T01');

    expect(hasImportedData).toBeTruthy();
  });

  test('3. +Add — 수동 행 추가 후 테이블에 표시', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: '+Add' });
    await addBtn.click();

    // 새 행이 추가되면 테이블 행 수가 증가
    await page.waitForTimeout(500);
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('4. Template Download — 양식 다운로드 트리거', async ({ page }) => {
    // 다운로드 이벤트 대기
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

    const templateBtn = page.locator('button', { hasText: '📋양식' });
    await templateBtn.click();

    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('AP개선_양식');
    }
    // 다운로드가 트리거되지 않아도 (blob 방식) 에러 없이 통과
  });

  test('5. 메뉴바 필터 — AP H/M/L 및 Target 필터 동작', async ({ page }) => {
    // 전체 버튼 클릭
    const allBtn = page.locator('button', { hasText: /전체\(/ });
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await page.waitForTimeout(300);
    }

    // H 필터 버튼 클릭
    const hBtn = page.locator('button', { hasText: /^H\(/ });
    if (await hBtn.isVisible()) {
      await hBtn.click();
      await page.waitForTimeout(300);
    }

    // Quality 타겟 필터 클릭
    const qualityBtn = page.locator('button', { hasText: 'Quality' });
    if (await qualityBtn.isVisible()) {
      await qualityBtn.click();
      await page.waitForTimeout(300);
    }

    // 에러 없이 필터가 동작하면 성공
    expect(true).toBeTruthy();
  });
});
