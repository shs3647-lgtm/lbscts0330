import { test, expect } from '@playwright/test';

test.describe('CP Import 테이블 내부 스크롤바 제거 검증', () => {
  test.beforeEach(async ({ page }) => {
    // CP Import 페이지로 이동
    await page.goto('http://localhost:3000/control-plan/import');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 테이블 렌더링 대기
  });

  test('테이블 내부에 스크롤바가 없는지 확인', async ({ page }) => {
    // cp-import-scroll-container 찾기
    const container = page.locator('#cp-import-scroll-container');
    await expect(container).toBeVisible();

    // 테이블 찾기
    const table = container.locator('table');
    await expect(table).toBeVisible();

    // 테이블의 overflow 속성 확인
    const tableOverflow = await table.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
      };
    });

    console.log('테이블 overflow 속성:', tableOverflow);

    // 테이블의 scrollWidth와 clientWidth 비교
    const tableDimensions = await table.evaluate((el) => {
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        hasHorizontalScroll: el.scrollWidth > el.clientWidth,
        hasVerticalScroll: el.scrollHeight > el.clientHeight,
      };
    });

    console.log('테이블 크기 정보:', tableDimensions);

    // 테이블 내부에 스크롤바가 있는지 확인 (Webkit)
    const hasWebkitScrollbar = await table.evaluate((el) => {
      const style = window.getComputedStyle(el, '::-webkit-scrollbar');
      return style.display !== 'none' && style.width !== '0px';
    });

    console.log('테이블 Webkit 스크롤바 존재:', hasWebkitScrollbar);

    // 테이블의 overflow는 visible이어야 함
    expect(tableOverflow.overflow).toBe('visible');
    expect(tableOverflow.overflowX).toBe('visible');
    expect(tableOverflow.overflowY).toBe('visible');

    // 테이블 자체에는 스크롤이 없어야 함 (scrollWidth === clientWidth)
    expect(tableDimensions.hasHorizontalScroll).toBe(false);
    expect(tableDimensions.hasVerticalScroll).toBe(false);
    
    // 테이블 Webkit 스크롤바가 없어야 함
    expect(hasWebkitScrollbar).toBe(false);
  });

  test('컨테이너에는 스크롤바가 있는지 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    await expect(container).toBeVisible();

    // 컨테이너의 스크롤 가능 여부 확인
    const containerDimensions = await container.evaluate((el) => {
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        hasHorizontalScroll: el.scrollWidth > el.clientWidth,
        hasVerticalScroll: el.scrollHeight > el.clientHeight,
      };
    });

    console.log('컨테이너 크기 정보:', containerDimensions);

    // 컨테이너는 스크롤 가능해야 함 (테이블이 2000px이므로)
    expect(containerDimensions.hasHorizontalScroll).toBe(true);
  });

  test('테이블 자식 요소들의 overflow 속성 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    const table = container.locator('table');

    // thead 확인
    const thead = table.locator('thead');
    const theadOverflow = await thead.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
      };
    });

    console.log('thead overflow 속성:', theadOverflow);

    // tbody 확인
    const tbody = table.locator('tbody');
    const tbodyOverflow = await tbody.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
      };
    });

    console.log('tbody overflow 속성:', tbodyOverflow);

    // 모든 요소의 overflow는 visible이어야 함
    expect(theadOverflow.overflow).toBe('visible');
    expect(tbodyOverflow.overflow).toBe('visible');
  });
});

