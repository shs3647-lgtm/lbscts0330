import { test, expect } from '@playwright/test';

/**
 * CP 워크시트 스크롤바 검증 테스트
 * 
 * 검증 항목:
 * 1. cp-worksheet-scroll-container가 존재하는지
 * 2. 테이블 너비가 컨테이너보다 넓은지
 * 3. StatusBar에 스크롤바가 표시되는지
 * 4. 실제 스크롤이 가능한지
 */
test.describe('CP 워크시트 스크롤바 검증', () => {
  test.beforeEach(async ({ page }) => {
    // CP 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/control-plan/worksheet');
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');
    // 추가 대기 (테이블 렌더링)
    await page.waitForTimeout(1000);
  });

  test('스크롤 컨테이너 존재 확인', async ({ page }) => {
    const container = page.locator('#cp-worksheet-scroll-container');
    await expect(container).toBeVisible();
    
    const containerInfo = await container.evaluate((el) => ({
      id: el.id,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      hasScroll: el.scrollWidth > el.clientWidth,
    }));
    
    console.log('스크롤 컨테이너 정보:', containerInfo);
    
    expect(containerInfo.id).toBe('cp-worksheet-scroll-container');
  });

  test('테이블 너비 확인', async ({ page }) => {
    const table = page.locator('#cp-worksheet-scroll-container table');
    await expect(table).toBeVisible();
    
    const tableInfo = await table.evaluate((el) => ({
      width: el.offsetWidth,
      scrollWidth: el.scrollWidth,
      minWidth: window.getComputedStyle(el).minWidth,
    }));
    
    console.log('테이블 정보:', tableInfo);
    
    // 테이블 너비가 1330px 이상이어야 함
    expect(parseInt(tableInfo.width.toString())).toBeGreaterThanOrEqual(1330);
  });

  test('스크롤 가능 여부 확인', async ({ page }) => {
    const container = page.locator('#cp-worksheet-scroll-container');
    
    const scrollInfo = await container.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      canScroll: el.scrollWidth > el.clientWidth,
      difference: el.scrollWidth - el.clientWidth,
    }));
    
    console.log('스크롤 정보:', scrollInfo);
    
    // 스크롤이 가능해야 함 (차이가 1px 이상)
    expect(scrollInfo.canScroll).toBe(true);
    expect(scrollInfo.difference).toBeGreaterThan(0);
  });

  test('StatusBar 스크롤바 표시 확인', async ({ page }) => {
    // StatusBar 찾기 (footer 태그)
    const statusBar = page.locator('footer');
    await expect(statusBar).toBeVisible();
    
    // StatusBar 내부에서 스크롤 관련 요소 찾기
    const scrollTrack = statusBar.locator('div').filter({ hasText: /스크롤/ }).or(statusBar.locator('div[class*="flex-1"]'));
    
    // 스크롤바가 표시되는지 확인
    const statusText = await statusBar.textContent();
    console.log('StatusBar 텍스트:', statusText);
    
    // 스크롤 가능 여부를 확인하기 위해 컨테이너 정보 가져오기
    const container = page.locator('#cp-worksheet-scroll-container');
    const canScroll = await container.evaluate((el) => el.scrollWidth > el.clientWidth);
    
    if (canScroll) {
      // 스크롤이 가능하면 "스크롤 없음"이 아니어야 함
      expect(statusText).not.toContain('스크롤 없음');
      console.log('✅ 스크롤 가능: StatusBar에 스크롤바 표시됨');
    } else {
      console.log('⚠️ 스크롤 불가능: StatusBar에 "스크롤 없음" 표시됨');
    }
  });

  test('실제 스크롤 동작 확인', async ({ page }) => {
    const container = page.locator('#cp-worksheet-scroll-container');
    
    // 초기 스크롤 위치
    const initialScroll = await container.evaluate((el) => el.scrollLeft);
    console.log('초기 스크롤 위치:', initialScroll);
    
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
    } else {
      console.log('⚠️ 스크롤 불가능: 테이블이 컨테이너보다 작음');
      throw new Error('스크롤이 불가능합니다. 테이블 너비를 확인하세요.');
    }
  });

  test('전체 스크롤 상태 종합 확인', async ({ page }) => {
    const container = page.locator('#cp-worksheet-scroll-container');
    const table = page.locator('#cp-worksheet-scroll-container table');
    
    const fullInfo = await page.evaluate(() => {
      const containerEl = document.getElementById('cp-worksheet-scroll-container');
      const tableEl = containerEl?.querySelector('table');
      
      if (!containerEl || !tableEl) {
        return null;
      }
      
      return {
        container: {
          id: containerEl.id,
          scrollWidth: containerEl.scrollWidth,
          clientWidth: containerEl.clientWidth,
          offsetWidth: containerEl.offsetWidth,
          canScroll: containerEl.scrollWidth > containerEl.clientWidth,
        },
        table: {
          offsetWidth: tableEl.offsetWidth,
          scrollWidth: tableEl.scrollWidth,
          computedWidth: window.getComputedStyle(tableEl).width,
          computedMinWidth: window.getComputedStyle(tableEl).minWidth,
        },
        wrapper: (() => {
          const wrapper = containerEl.querySelector('div');
          if (wrapper) {
            return {
              offsetWidth: wrapper.offsetWidth,
              computedWidth: window.getComputedStyle(wrapper).width,
              computedMinWidth: window.getComputedStyle(wrapper).minWidth,
            };
          }
          return null;
        })(),
      };
    });
    
    console.log('전체 스크롤 상태:', JSON.stringify(fullInfo, null, 2));
    
    expect(fullInfo).not.toBeNull();
    expect(fullInfo?.container.canScroll).toBe(true);
  });
});

