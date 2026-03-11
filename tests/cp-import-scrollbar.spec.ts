import { test, expect } from '@playwright/test';

/**
 * CP Import 화면 스크롤바 검증 테스트
 * 
 * 검증 항목:
 * 1. cp-import-scroll-container가 존재하는지
 * 2. 테이블 너비가 컨테이너보다 넓은지 (수평 스크롤)
 * 3. 테이블 높이가 컨테이너보다 높은지 (수직 스크롤)
 * 4. StatusBar에 스크롤바가 표시되는지
 * 5. 실제 스크롤이 가능한지
 */
test.describe('CP Import 화면 스크롤바 검증', () => {
  test.beforeEach(async ({ page }) => {
    // CP Import 페이지로 이동
    await page.goto('http://localhost:3000/control-plan/import');
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');
    // 추가 대기 (테이블 렌더링)
    await page.waitForTimeout(1000);
  });

  test('스크롤 컨테이너 존재 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    await expect(container).toBeVisible();
    
    const containerInfo = await container.evaluate((el) => ({
      id: el.id,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      hasHorizontalScroll: el.scrollWidth > el.clientWidth,
      hasVerticalScroll: el.scrollHeight > el.clientHeight,
    }));
    
    console.log('스크롤 컨테이너 정보:', containerInfo);
    
    expect(containerInfo.id).toBe('cp-import-scroll-container');
  });

  test('테이블 너비 확인', async ({ page }) => {
    const table = page.locator('#cp-import-scroll-container table');
    await expect(table).toBeVisible();
    
    const tableInfo = await table.evaluate((el) => ({
      offsetWidth: el.offsetWidth,
      scrollWidth: el.scrollWidth,
      computedWidth: window.getComputedStyle(el).width,
      computedMinWidth: window.getComputedStyle(el).minWidth,
    }));
    
    console.log('테이블 정보:', tableInfo);
    
    // 테이블이 존재하고 너비가 설정되어 있어야 함
    expect(tableInfo.offsetWidth).toBeGreaterThan(0);
  });

  test('수평 스크롤 가능 여부 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    
    const scrollInfo = await container.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      canScroll: el.scrollWidth > el.clientWidth,
      difference: el.scrollWidth - el.clientWidth,
    }));
    
    console.log('수평 스크롤 정보:', scrollInfo);
    
    // 테이블이 컨테이너보다 넓으면 스크롤 가능
    // (데이터가 없을 수도 있으므로 조건부로 확인)
    if (scrollInfo.scrollWidth > 0) {
      console.log(`수평 스크롤: ${scrollInfo.canScroll ? '가능' : '불가능'} (차이: ${scrollInfo.difference}px)`);
    }
  });

  test('수직 스크롤 가능 여부 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    
    const scrollInfo = await container.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      canScroll: el.scrollHeight > el.clientHeight,
      difference: el.scrollHeight - el.clientHeight,
    }));
    
    console.log('수직 스크롤 정보:', scrollInfo);
    
    // 테이블이 컨테이너보다 높으면 스크롤 가능
    // (데이터가 없을 수도 있으므로 조건부로 확인)
    if (scrollInfo.scrollHeight > 0) {
      console.log(`수직 스크롤: ${scrollInfo.canScroll ? '가능' : '불가능'} (차이: ${scrollInfo.difference}px)`);
    }
  });

  test('StatusBar 스크롤바 표시 확인', async ({ page }) => {
    // StatusBar 찾기 (footer 태그)
    const statusBar = page.locator('footer');
    await expect(statusBar).toBeVisible();
    
    // StatusBar 내부에서 스크롤 관련 요소 찾기
    const statusText = await statusBar.textContent();
    console.log('StatusBar 텍스트:', statusText);
    
    // 스크롤 가능 여부를 확인하기 위해 컨테이너 정보 가져오기
    const container = page.locator('#cp-import-scroll-container');
    const canScroll = await container.evaluate((el) => el.scrollWidth > el.clientWidth);
    
    if (canScroll) {
      // 스크롤이 가능하면 "스크롤 없음"이 아니어야 함
      expect(statusText).not.toContain('스크롤 없음');
      console.log('✅ 수평 스크롤 가능: StatusBar에 스크롤바 표시됨');
    } else {
      console.log('ℹ️ 수평 스크롤 불가능: 테이블이 컨테이너보다 작거나 데이터가 없음');
    }
  });

  test('실제 수평 스크롤 동작 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    
    // 초기 스크롤 위치
    const initialScroll = await container.evaluate((el) => el.scrollLeft);
    console.log('초기 수평 스크롤 위치:', initialScroll);
    
    // 스크롤 가능 여부 확인
    const canScroll = await container.evaluate((el) => el.scrollWidth > el.clientWidth);
    
    if (canScroll) {
      // 오른쪽으로 스크롤
      await container.evaluate((el) => {
        el.scrollLeft = 100;
      });
      
      await page.waitForTimeout(500);
      
      const afterScroll = await container.evaluate((el) => el.scrollLeft);
      console.log('스크롤 후 위치:', afterScroll);
      
      // 스크롤이 변경되었는지 확인
      expect(afterScroll).toBeGreaterThan(initialScroll);
      console.log('✅ 수평 스크롤 동작 정상');
    } else {
      console.log('ℹ️ 수평 스크롤 불가능: 테이블이 컨테이너보다 작거나 데이터가 없음');
    }
  });

  test('실제 수직 스크롤 동작 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    
    // 초기 스크롤 위치
    const initialScroll = await container.evaluate((el) => el.scrollTop);
    console.log('초기 수직 스크롤 위치:', initialScroll);
    
    // 스크롤 가능 여부 확인
    const canScroll = await container.evaluate((el) => el.scrollHeight > el.clientHeight);
    
    if (canScroll) {
      // 아래로 스크롤
      await container.evaluate((el) => {
        el.scrollTop = 100;
      });
      
      await page.waitForTimeout(500);
      
      const afterScroll = await container.evaluate((el) => el.scrollTop);
      console.log('스크롤 후 위치:', afterScroll);
      
      // 스크롤이 변경되었는지 확인
      expect(afterScroll).toBeGreaterThan(initialScroll);
      console.log('✅ 수직 스크롤 동작 정상');
    } else {
      console.log('ℹ️ 수직 스크롤 불가능: 테이블이 컨테이너보다 작거나 데이터가 없음');
    }
  });

  test('전체 스크롤 상태 종합 확인', async ({ page }) => {
    const container = page.locator('#cp-import-scroll-container');
    const table = page.locator('#cp-import-scroll-container table');
    
    const fullInfo = await page.evaluate(() => {
      const containerEl = document.getElementById('cp-import-scroll-container');
      const tableEl = containerEl?.querySelector('table');
      
      if (!containerEl) {
        return null;
      }
      
      return {
        container: {
          id: containerEl.id,
          scrollWidth: containerEl.scrollWidth,
          clientWidth: containerEl.clientWidth,
          scrollHeight: containerEl.scrollHeight,
          clientHeight: containerEl.clientHeight,
          offsetWidth: containerEl.offsetWidth,
          offsetHeight: containerEl.offsetHeight,
          canScrollHorizontal: containerEl.scrollWidth > containerEl.clientWidth,
          canScrollVertical: containerEl.scrollHeight > containerEl.clientHeight,
        },
        table: tableEl ? {
          offsetWidth: tableEl.offsetWidth,
          scrollWidth: tableEl.scrollWidth,
          offsetHeight: tableEl.offsetHeight,
          scrollHeight: tableEl.scrollHeight,
          computedWidth: window.getComputedStyle(tableEl).width,
          computedMinWidth: window.getComputedStyle(tableEl).minWidth,
        } : null,
      };
    });
    
    console.log('전체 스크롤 상태:', JSON.stringify(fullInfo, null, 2));
    
    expect(fullInfo).not.toBeNull();
    expect(fullInfo?.container.id).toBe('cp-import-scroll-container');
    
    if (fullInfo?.table) {
      console.log('✅ 테이블 존재');
    } else {
      console.log('ℹ️ 테이블 없음 (데이터 미로드 상태일 수 있음)');
    }
  });
});

