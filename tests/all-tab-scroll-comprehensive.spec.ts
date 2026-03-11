/**
 * @file all-tab-scroll-comprehensive.spec.ts
 * @description All 탭 좌우 스크롤 종합 테스트 - 근본 원인 분석
 */

import { test, expect } from '@playwright/test';

test.describe('All 탭 좌우 스크롤 종합 분석', () => {
  
  test('1. 스크롤 컨테이너 존재 및 식별', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    // 여러 방법으로 스크롤 컨테이너 찾기
    const byId = await page.locator('#worksheet-scroll-container').count();
    const byClass = await page.locator('.all-tab-scroll-container').count();
    const byStyle = await page.locator('div[style*="overflow-x: scroll"]').count();
    
    console.log('=== 스크롤 컨테이너 식별 ===');
    console.log('ID로 찾기:', byId);
    console.log('Class로 찾기:', byClass);
    console.log('Style로 찾기:', byStyle);
    
    expect(byId).toBeGreaterThan(0);
  });

  test('2. 부모 요소 overflow 분석', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    const analysis = await page.evaluate(() => {
      const container = document.getElementById('worksheet-scroll-container');
      if (!container) return { error: 'Container not found' };
      
      const ancestors: any[] = [];
      let el: HTMLElement | null = container;
      
      for (let i = 0; i < 10 && el; i++) {
        const style = window.getComputedStyle(el);
        ancestors.push({
          level: i,
          tag: el.tagName,
          id: el.id || '',
          class: el.className.split(' ').slice(0, 3).join(' '),
          overflow: style.overflow,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          position: style.position,
          width: el.offsetWidth,
          scrollWidth: el.scrollWidth,
          canScrollX: el.scrollWidth > el.clientWidth,
        });
        el = el.parentElement;
      }
      
      return { ancestors };
    });
    
    console.log('=== 부모 요소 overflow 분석 ===');
    if (analysis.ancestors) {
      analysis.ancestors.forEach((a: any) => {
        console.log(`Level ${a.level}: ${a.tag}#${a.id || a.class}`);
        console.log(`  overflow: ${a.overflow}, overflowX: ${a.overflowX}`);
        console.log(`  width: ${a.width}, scrollWidth: ${a.scrollWidth}, canScrollX: ${a.canScrollX}`);
      });
    }
  });

  test('3. 실제 마우스 드래그 스크롤 테스트', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    const container = page.locator('#worksheet-scroll-container');
    const box = await container.boundingBox();
    
    if (!box) {
      console.log('Container bounding box not found');
      return;
    }
    
    console.log('=== 마우스 드래그 테스트 ===');
    console.log('Container box:', box);
    
    // 스크롤바 영역 클릭 (하단)
    const scrollbarY = box.y + box.height - 10;
    const startX = box.x + 100;
    
    const before = await container.evaluate((el) => el.scrollLeft);
    console.log('드래그 전 scrollLeft:', before);
    
    // 하단 스크롤바 영역에서 드래그
    await page.mouse.move(startX, scrollbarY);
    await page.mouse.down();
    await page.mouse.move(startX + 300, scrollbarY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    const after = await container.evaluate((el) => el.scrollLeft);
    console.log('드래그 후 scrollLeft:', after);
    console.log('변화량:', after - before);
  });

  test('4. 키보드 화살표 스크롤 테스트', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    const container = page.locator('#worksheet-scroll-container');
    
    // 컨테이너에 포커스
    await container.click();
    
    const before = await container.evaluate((el) => el.scrollLeft);
    console.log('=== 키보드 스크롤 테스트 ===');
    console.log('키보드 전 scrollLeft:', before);
    
    // 오른쪽 화살표 키 10번
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowRight');
    }
    await page.waitForTimeout(300);
    
    const after = await container.evaluate((el) => el.scrollLeft);
    console.log('ArrowRight 10번 후 scrollLeft:', after);
    console.log('변화량:', after - before);
  });

  test('5. JavaScript scrollLeft 직접 변경', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    console.log('=== JavaScript 직접 스크롤 ===');
    
    const result = await page.evaluate(() => {
      const container = document.getElementById('worksheet-scroll-container');
      if (!container) return { error: 'not found' };
      
      const results: any[] = [];
      
      // 테스트 1: scrollLeft 직접 설정
      container.scrollLeft = 0;
      results.push({ test: 'reset', scrollLeft: container.scrollLeft });
      
      container.scrollLeft = 500;
      results.push({ test: 'set to 500', scrollLeft: container.scrollLeft });
      
      // 테스트 2: scrollTo
      container.scrollTo({ left: 1000, behavior: 'instant' });
      results.push({ test: 'scrollTo 1000', scrollLeft: container.scrollLeft });
      
      // 테스트 3: scrollBy
      container.scrollBy({ left: -500, behavior: 'instant' });
      results.push({ test: 'scrollBy -500', scrollLeft: container.scrollLeft });
      
      return { 
        results,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        maxScroll: container.scrollWidth - container.clientWidth
      };
    });
    
    console.log('Max scroll:', result.maxScroll);
    result.results?.forEach((r: any) => console.log(`${r.test}: scrollLeft = ${r.scrollLeft}`));
    
    expect(result.results?.[1]?.scrollLeft).toBe(500);
    expect(result.results?.[2]?.scrollLeft).toBe(1000);
  });

  test('6. 휠 이벤트 리스너 확인', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    console.log('=== 휠 이벤트 테스트 ===');
    
    // 휠 이벤트 수동 발생
    const result = await page.evaluate(() => {
      const container = document.getElementById('worksheet-scroll-container');
      if (!container) return { error: 'not found' };
      
      const before = container.scrollLeft;
      
      // 휠 이벤트 생성 및 발생
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        deltaX: 0,
        bubbles: true,
        cancelable: true,
      });
      
      container.dispatchEvent(wheelEvent);
      
      // 잠시 대기
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            before,
            after: container.scrollLeft,
            change: container.scrollLeft - before
          });
        }, 100);
      });
    });
    
    console.log('휠 이벤트 결과:', result);
  });

  test('7. CSS pointer-events 확인', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    const pointerEvents = await page.evaluate(() => {
      const container = document.getElementById('worksheet-scroll-container');
      if (!container) return { error: 'not found' };
      
      const results: any[] = [];
      let el: HTMLElement | null = container;
      
      for (let i = 0; i < 5 && el; i++) {
        const style = window.getComputedStyle(el);
        results.push({
          level: i,
          tag: el.tagName,
          pointerEvents: style.pointerEvents,
          userSelect: style.userSelect,
          touchAction: style.touchAction,
        });
        el = el.parentElement;
      }
      
      return results;
    });
    
    console.log('=== pointer-events 분석 ===');
    pointerEvents.forEach?.((p: any) => {
      console.log(`Level ${p.level} ${p.tag}: pointer-events=${p.pointerEvents}, touchAction=${p.touchAction}`);
    });
  });

  test('8. 실제 스크롤바 클릭 시뮬레이션', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    const container = page.locator('#worksheet-scroll-container');
    
    console.log('=== 스크롤바 클릭 테스트 ===');
    
    const info = await container.evaluate((el) => {
      return {
        offsetHeight: el.offsetHeight,
        clientHeight: el.clientHeight,
        scrollbarHeight: el.offsetHeight - el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });
    
    console.log('스크롤바 정보:', info);
    console.log('스크롤바 높이:', info.scrollbarHeight, 'px');
    
    if (info.scrollbarHeight > 0) {
      console.log('✅ 스크롤바 공간이 존재합니다');
    } else {
      console.log('❌ 스크롤바 공간이 0입니다 - 오버레이 스크롤바 사용 중');
    }
    
    // 강제로 스크롤 위치 변경
    await container.evaluate((el) => { el.scrollLeft = 500; });
    const scrolled = await container.evaluate((el) => el.scrollLeft);
    console.log('강제 스크롤 후:', scrolled);
    
    expect(scrolled).toBe(500);
  });
});



