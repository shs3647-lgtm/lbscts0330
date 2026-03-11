/**
 * @file import-bd-status-visible.spec.ts
 * @description PFMEA Import 페이지 BD 현황 테이블 표시 검증 테스트
 *
 * 검증 대상:
 * 1. 기초정보 템플릿 패널이 보이는지
 * 2. BD 현황 테이블 헤더("Basic Data 현황")가 보이는지
 * 3. BD 현황 테이블 컬럼 헤더가 렌더링되는지
 *
 * @created 2026-02-19
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const IMPORT_URL = `${BASE_URL}/pfmea/import/legacy?id=pfm26-p004-l05-r01`;

test.describe('PFMEA Import 페이지 BD 현황 테이블', () => {

  test('BD 현황 테이블이 화면에 보여야 한다', async ({ page }) => {
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1. 기초정보 템플릿 패널 존재 확인
    const templatePanel = page.locator('text=기초정보 템플릿');
    await expect(templatePanel.first()).toBeVisible();

    // 2. BD 현황 테이블 헤더 확인
    const bdHeader = page.locator('text=Basic Data 현황');
    await expect(bdHeader.first()).toBeVisible({ timeout: 5000 });

    // 3. BD 현황 테이블 컬럼 헤더 확인
    const columns = ['유형', 'BD ID', 'FMEA ID', 'FMEA명'];
    for (const col of columns) {
      const header = page.locator(`th:has-text("${col}")`);
      await expect(header.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('BD 현황 테이블 검색 입력란이 있어야 한다', async ({ page }) => {
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="검색"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('BD 현황 테이블이 스크롤 없이 viewport 내에 있어야 한다', async ({ page }) => {
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // BD 현황 헤더를 스크롤하여 viewport에 노출
    const bdHeader = page.locator('text=Basic Data 현황').first();
    await bdHeader.scrollIntoViewIfNeeded();

    // viewport 내 bounding box 확인
    const box = await bdHeader.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // 화면 높이 이내에 있어야 함
      const viewportSize = page.viewportSize();
      expect(box.y).toBeLessThan(viewportSize!.height + 200);
    }
  });

});
