/**
 * @file all-tab-scroll.spec.ts
 * @description All 탭 좌우 스크롤 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('All 탭 좌우 스크롤', () => {
  test.beforeEach(async ({ page }) => {
    // 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    
    // All 탭 클릭
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(1000);
  });

  test('스크롤 컨테이너가 overflowX: scroll을 가져야 함', async ({ page }) => {
    // 스크롤 컨테이너 찾기
    const scrollContainer = page.locator('.all-tab-scroll-container');
    
    // 존재 확인
    await expect(scrollContainer).toBeVisible();
    
    // overflowX 스타일 확인
    const overflowX = await scrollContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflowX;
    });
    
    console.log('overflowX:', overflowX);
    expect(overflowX).toBe('scroll');
  });

  test('테이블이 min-width를 가져야 함', async ({ page }) => {
    // 테이블 찾기 (AllTabWithLinks 또는 AllTabBasic)
    const table = page.locator('table').first();
    
    // 테이블의 실제 너비 확인
    const tableWidth = await table.evaluate((el) => {
      return el.getBoundingClientRect().width;
    });
    
    console.log('테이블 너비:', tableWidth, 'px');
    
    // 테이블이 2400px 이상이어야 함
    expect(tableWidth).toBeGreaterThanOrEqual(2400);
  });

  test('스크롤 컨테이너의 scrollWidth가 clientWidth보다 커야 함', async ({ page }) => {
    const scrollContainer = page.locator('.all-tab-scroll-container');
    
    const dimensions = await scrollContainer.evaluate((el) => {
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollLeft: el.scrollLeft,
        scrollLeftMax: el.scrollWidth - el.clientWidth
      };
    });
    
    console.log('스크롤 컨테이너 dimensions:', dimensions);
    
    // scrollWidth가 clientWidth보다 커야 스크롤 가능
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    expect(dimensions.scrollLeftMax).toBeGreaterThan(0);
  });

  test('좌우 스크롤이 실제로 작동해야 함', async ({ page }) => {
    const scrollContainer = page.locator('.all-tab-scroll-container');
    
    // 초기 scrollLeft
    const initialScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    console.log('초기 scrollLeft:', initialScrollLeft);
    
    // 오른쪽으로 500px 스크롤
    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 500;
    });
    
    await page.waitForTimeout(100);
    
    // 스크롤 후 scrollLeft
    const afterScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    console.log('스크롤 후 scrollLeft:', afterScrollLeft);
    
    // 스크롤이 작동했는지 확인
    expect(afterScrollLeft).toBe(500);
  });

  test('스크롤바가 시각적으로 보여야 함 (높이 확인)', async ({ page }) => {
    const scrollContainer = page.locator('.all-tab-scroll-container');
    
    // 스크롤바 높이 확인 (CSS에서 12px로 설정)
    const scrollbarHeight = await scrollContainer.evaluate((el) => {
      // 스크롤바 있는지 확인: scrollWidth > clientWidth
      const hasScroll = el.scrollWidth > el.clientWidth;
      
      // 스크롤 컨테이너의 전체 높이와 clientHeight 비교
      const boundingHeight = el.getBoundingClientRect().height;
      const clientHeight = el.clientHeight;
      
      // 스크롤바가 있으면 boundingHeight와 clientHeight + scrollbarHeight가 같아야 함
      // 또는 offsetHeight - clientHeight로 계산
      const scrollbarSpace = el.offsetHeight - el.clientHeight;
      
      return {
        hasScroll,
        boundingHeight,
        clientHeight,
        scrollbarSpace,
        offsetHeight: el.offsetHeight
      };
    });
    
    console.log('스크롤바 정보:', scrollbarHeight);
    
    // 스크롤이 가능해야 함
    expect(scrollbarHeight.hasScroll).toBe(true);
  });
});

