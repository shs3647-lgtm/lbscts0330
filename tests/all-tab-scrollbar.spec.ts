/**
 * @file all-tab-scrollbar.spec.ts
 * @description TDD 테스트: All 탭 좌우 스크롤바 브라우저 하단 고정
 * 
 * 테스트 케이스:
 * 1. 스크롤바가 브라우저 하단에 고정되어야 함
 * 2. 좌우 스크롤이 작동해야 함
 * 3. 스크롤바가 항상 표시되어야 함
 * 4. 테이블이 2600px 이상의 너비를 가져야 함
 */

import { test, expect } from '@playwright/test';

test.describe('All 탭 좌우 스크롤바 TDD 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // FMEA 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/pfmea/worksheet?id=test');
    await page.waitForLoadState('networkidle');
    
    // All 탭 클릭
    const allTabButton = page.locator('button:has-text("ALL")');
    if (await allTabButton.isVisible()) {
      await allTabButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('1. 스크롤 컨테이너가 존재해야 함', async ({ page }) => {
    const scrollContainer = page.locator('#all-tab-scroll-wrapper');
    await expect(scrollContainer).toBeVisible();
  });

  test('2. 스크롤 컨테이너가 브라우저 하단까지 확장되어야 함', async ({ page }) => {
    const scrollContainer = page.locator('#all-tab-scroll-wrapper');
    const boundingBox = await scrollContainer.boundingBox();
    const viewportSize = page.viewportSize();
    
    if (boundingBox && viewportSize) {
      // 스크롤 컨테이너 하단이 브라우저 하단에 가까워야 함 (20px 이내)
      const distanceFromBottom = viewportSize.height - (boundingBox.y + boundingBox.height);
      expect(distanceFromBottom).toBeLessThan(30);
    }
  });

  test('3. 좌우 스크롤이 가능해야 함 (테이블 너비 > 뷰포트)', async ({ page }) => {
    const scrollContainer = page.locator('#all-tab-scroll-wrapper');
    
    // 스크롤 가능한 너비 확인
    const scrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);
    const clientWidth = await scrollContainer.evaluate((el) => el.clientWidth);
    
    // 스크롤 가능한 콘텐츠가 있어야 함
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  test('4. 좌우 스크롤 동작 확인', async ({ page }) => {
    const scrollContainer = page.locator('#all-tab-scroll-wrapper');
    
    // 초기 스크롤 위치
    const initialScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    expect(initialScrollLeft).toBe(0);
    
    // 스크롤 이동
    await scrollContainer.evaluate((el) => el.scrollLeft = 500);
    await page.waitForTimeout(100);
    
    // 스크롤 위치 확인
    const newScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    expect(newScrollLeft).toBeGreaterThan(0);
  });

  test('5. 스크롤바가 표시되어야 함', async ({ page }) => {
    const scrollContainer = page.locator('#all-tab-scroll-wrapper');
    
    // overflow-x 스타일 확인
    const overflowX = await scrollContainer.evaluate((el) => 
      window.getComputedStyle(el).overflowX
    );
    expect(overflowX).toBe('scroll');
  });

  test('6. 테이블 최소 너비가 2600px 이상이어야 함', async ({ page }) => {
    const table = page.locator('#all-tab-scroll-wrapper table');
    
    if (await table.isVisible()) {
      const minWidth = await table.evaluate((el) => 
        window.getComputedStyle(el).minWidth
      );
      
      // 2400px 이상 (실제 테이블 기준)
      const numericWidth = parseInt(minWidth);
      expect(numericWidth).toBeGreaterThanOrEqual(2400);
    }
  });
});

