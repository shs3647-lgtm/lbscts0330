import { test, expect } from '@playwright/test';

test.describe('CP Import Layout Tests', () => {
  const CP_IMPORT_URL = 'http://localhost:3000/control-plan/import?id=cp26-m001';

  test.beforeEach(async ({ page }) => {
    await page.goto(CP_IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Ensure all elements are rendered
  });

  test('메뉴바 고정 크기 검증 (헤더 + 3행 입력 영역)', async ({ page }) => {
    // 헤더 영역 크기 확인 - 메인 컨테이너의 첫 번째 자식 div
    const mainContainer = page.locator('div.flex.flex-col.h-screen').first();
    const header = mainContainer.locator('> div').first();
    const headerWidth = await header.evaluate((el: HTMLElement) => el.offsetWidth);
    console.log('헤더 너비:', headerWidth, 'px');
    
    // 메뉴 영역 (3행 입력 영역) 크기 확인 - 메인 컨테이너의 두 번째 자식 div
    const menuArea = mainContainer.locator('> div').nth(1);
    const menuAreaWidth = await menuArea.evaluate((el: HTMLElement) => el.offsetWidth);
    console.log('메뉴 영역 너비:', menuAreaWidth, 'px');

    // 고정 크기: 1414px (허용 오차: 2px)
    expect(Math.abs(headerWidth - 1414)).toBeLessThanOrEqual(2);
    expect(Math.abs(menuAreaWidth - 1414)).toBeLessThanOrEqual(2);
  });

  test('미리보기 영역 반응형 동작 검증', async ({ page }) => {
    const previewContainer = page.locator('#cp-import-scroll-container');
    
    // 초기 크기 확인
    const initialWidth = await previewContainer.evaluate((el: HTMLElement) => el.offsetWidth);
    console.log('미리보기 영역 초기 너비:', initialWidth, 'px');

    // viewport 크기 확인
    const viewportSize = page.viewportSize();
    console.log('Viewport 너비:', viewportSize?.width, 'px');

    // 미리보기 영역이 flex-1로 반응형인지 확인 (고정 크기가 아니어야 함)
    expect(initialWidth).toBeGreaterThan(0);
    expect(initialWidth).toBeLessThan(2000); // 합리적인 범위 내
  });

  test('브라우저 배율 변경 시 메뉴바 크기 유지', async ({ page }) => {
    const mainContainer = page.locator('div.flex.flex-col.h-screen').first();
    const header = mainContainer.locator('> div').first();
    
    // 100% 배율에서 메뉴바 크기 확인
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    const header100 = await header.evaluate((el: HTMLElement) => el.offsetWidth);
    console.log('100% 배율 헤더 너비:', header100, 'px');

    // 125% 배율로 변경 (viewport 크기 축소로 시뮬레이션)
    await page.setViewportSize({ width: 1536, height: 864 }); // 125% 효과
    await page.waitForTimeout(500);
    
    const header125 = await header.evaluate((el: HTMLElement) => el.offsetWidth);
    console.log('125% 배율 헤더 너비:', header125, 'px');

    // 메뉴바는 고정 크기를 유지해야 함 (허용 오차: 5px)
    expect(Math.abs(header100 - header125)).toBeLessThanOrEqual(5);
  });

  test('레이아웃 구조 검증 (flex 컨테이너)', async ({ page }) => {
    // 메인 컨테이너 확인
    const mainContainer = page.locator('div.flex.flex-col.h-screen').first();
    const mainContainerFlex = await mainContainer.evaluate((el: HTMLElement) => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        flexDirection: styles.flexDirection,
      };
    });
    
    expect(mainContainerFlex.display).toBe('flex');
    expect(mainContainerFlex.flexDirection).toBe('column');
  });

  test('메뉴바 flex-shrink 검증', async ({ page }) => {
    const mainContainer = page.locator('div.flex.flex-col.h-screen').first();
    const header = mainContainer.locator('> div').first();
    const headerFlexShrink = await header.evaluate((el: HTMLElement) => {
      const styles = window.getComputedStyle(el);
      return styles.flexShrink;
    });
    
    expect(headerFlexShrink).toBe('0'); // flex-shrink-0 확인
  });

  test('미리보기 영역 flex-1 검증', async ({ page }) => {
    const previewContainer = page.locator('#cp-import-scroll-container');
    const previewFlex = await previewContainer.evaluate((el: HTMLElement) => {
      const styles = window.getComputedStyle(el);
      return {
        flexGrow: styles.flexGrow,
        flexShrink: styles.flexShrink,
        flexBasis: styles.flexBasis,
      };
    });
    
    console.log('미리보기 영역 flex 속성:', previewFlex);
    
    // flex-1은 flex-grow: 1, flex-shrink: 1, flex-basis: 0%를 의미
    expect(previewFlex.flexGrow).toBe('1');
  });

  test('전체 레이아웃 스크롤 동작 확인', async ({ page }) => {
    const previewContainer = page.locator('#cp-import-scroll-container');
    
    // 스크롤 가능 여부 확인
    const scrollable = await previewContainer.evaluate((el: HTMLElement) => {
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });
    
    console.log('미리보기 영역 스크롤 정보:', scrollable);
    
    // 가로 또는 세로 스크롤이 필요할 수 있음
    expect(scrollable.scrollWidth).toBeGreaterThan(0);
    expect(scrollable.scrollHeight).toBeGreaterThan(0);
  });

  test('다양한 viewport 크기에서 레이아웃 안정성 확인', async ({ page }) => {
    const viewportSizes = [
      { width: 1920, height: 1080 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 },
    ];

    const mainContainer = page.locator('div.flex.flex-col.h-screen').first();
    const header = mainContainer.locator('> div').first();
    const menuArea = mainContainer.locator('> div').nth(1);

    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);

      const headerWidth = await header.evaluate((el: HTMLElement) => el.offsetWidth);
      const menuAreaWidth = await menuArea.evaluate((el: HTMLElement) => el.offsetWidth);

      console.log(`Viewport ${size.width}x${size.height}: 헤더=${headerWidth}px, 메뉴=${menuAreaWidth}px`);

      // 메뉴바는 모든 viewport 크기에서 고정 크기 유지
      expect(Math.abs(headerWidth - 1414)).toBeLessThanOrEqual(5);
      expect(Math.abs(menuAreaWidth - 1414)).toBeLessThanOrEqual(5);
    }
  });
});
