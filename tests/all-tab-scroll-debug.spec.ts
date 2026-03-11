/**
 * @file all-tab-scroll-debug.spec.ts
 * @description All 탭 좌우 스크롤 디버그 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('All 탭 좌우 스크롤 디버그', () => {
  test('스크롤 컨테이너 상태 전체 확인', async ({ page }) => {
    // 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    
    // All 탭 클릭
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    // 스크롤 컨테이너 찾기
    const container = page.locator('#worksheet-scroll-container');
    const containerExists = await container.count();
    console.log('📦 스크롤 컨테이너 존재:', containerExists > 0 ? 'YES' : 'NO');
    
    if (containerExists === 0) {
      // ID가 없으면 클래스로 찾기
      const containerByClass = page.locator('.all-tab-scroll-container');
      const byClassExists = await containerByClass.count();
      console.log('📦 클래스로 찾기:', byClassExists > 0 ? 'YES' : 'NO');
    }
    
    // 스크롤 컨테이너 스타일 확인
    const containerStyles = await container.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        width: el.offsetWidth,
        height: el.offsetHeight,
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        position: computed.position,
        display: computed.display,
      };
    });
    
    console.log('📊 스크롤 컨테이너 스타일:');
    console.log('   - overflowX:', containerStyles.overflowX);
    console.log('   - overflowY:', containerStyles.overflowY);
    console.log('   - width:', containerStyles.width);
    console.log('   - height:', containerStyles.height);
    console.log('   - scrollWidth:', containerStyles.scrollWidth);
    console.log('   - clientWidth:', containerStyles.clientWidth);
    console.log('   - 스크롤 가능 범위:', containerStyles.scrollWidth - containerStyles.clientWidth);
    
    // 테이블 찾기
    const table = container.locator('table').first();
    const tableExists = await table.count();
    console.log('📋 테이블 존재:', tableExists > 0 ? 'YES' : 'NO');
    
    if (tableExists > 0) {
      const tableStyles = await table.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          width: el.offsetWidth,
          minWidth: computed.minWidth,
          display: computed.display,
        };
      });
      console.log('📋 테이블 스타일:');
      console.log('   - width:', tableStyles.width);
      console.log('   - minWidth:', tableStyles.minWidth);
    }
    
    // 스크롤 테스트
    console.log('\n🔧 스크롤 테스트 시작...');
    
    const before = await container.evaluate((el) => el.scrollLeft);
    console.log('   - 스크롤 전 scrollLeft:', before);
    
    // 방법 1: scrollLeft 직접 설정
    await container.evaluate((el) => { el.scrollLeft = 300; });
    await page.waitForTimeout(100);
    const after1 = await container.evaluate((el) => el.scrollLeft);
    console.log('   - scrollLeft = 300 후:', after1);
    
    // 방법 2: scrollTo 사용
    await container.evaluate((el) => { el.scrollTo({ left: 600, behavior: 'instant' }); });
    await page.waitForTimeout(100);
    const after2 = await container.evaluate((el) => el.scrollLeft);
    console.log('   - scrollTo(600) 후:', after2);
    
    // 방법 3: scrollBy 사용
    await container.evaluate((el) => { el.scrollBy({ left: 200, behavior: 'instant' }); });
    await page.waitForTimeout(100);
    const after3 = await container.evaluate((el) => el.scrollLeft);
    console.log('   - scrollBy(200) 후:', after3);
    
    // 결과 확인
    console.log('\n✅ 결과:');
    const canScroll = containerStyles.scrollWidth > containerStyles.clientWidth;
    const scrollWorks = after1 === 300 && after2 === 600 && after3 === 800;
    console.log('   - 스크롤 가능:', canScroll ? 'YES' : 'NO');
    console.log('   - 스크롤 작동:', scrollWorks ? 'YES' : 'NO');
    
    expect(canScroll).toBe(true);
    expect(after1).toBe(300);
    expect(after2).toBe(600);
    expect(after3).toBe(800);
  });

  test('마우스 휠 이벤트 테스트', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    const container = page.locator('#worksheet-scroll-container');
    
    // 초기 스크롤 위치
    const before = await container.evaluate((el) => el.scrollLeft);
    console.log('휠 이벤트 전 scrollLeft:', before);
    
    // 컨테이너 위에서 마우스 휠 이벤트 발생
    await container.hover();
    await page.mouse.wheel(0, 300); // 세로 스크롤
    await page.waitForTimeout(500);
    
    const after = await container.evaluate((el) => el.scrollLeft);
    console.log('휠 이벤트 후 scrollLeft:', after);
    console.log('스크롤 변화량:', after - before);
    
    // 휠로 스크롤이 되었는지 확인
    expect(after).toBeGreaterThan(before);
  });

  test('DOM 구조 확인', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    // DOM 구조 확인
    const structure = await page.evaluate(() => {
      const container = document.getElementById('worksheet-scroll-container');
      if (!container) return { error: 'Container not found' };
      
      const getAncestorOverflows = (el: HTMLElement, depth = 5): string[] => {
        const result: string[] = [];
        let current: HTMLElement | null = el;
        for (let i = 0; i < depth && current; i++) {
          const style = window.getComputedStyle(current);
          result.push(`${current.tagName}.${current.className.split(' ')[0]}: overflow=${style.overflow}, overflowX=${style.overflowX}`);
          current = current.parentElement;
        }
        return result;
      };
      
      return {
        containerId: container.id,
        containerClass: container.className,
        ancestorOverflows: getAncestorOverflows(container),
        childrenCount: container.children.length,
        firstChildTag: container.children[0]?.tagName,
      };
    });
    
    console.log('🏗️ DOM 구조:');
    console.log('   - Container ID:', structure.containerId);
    console.log('   - Container Class:', structure.containerClass);
    console.log('   - Children Count:', structure.childrenCount);
    console.log('   - First Child:', structure.firstChildTag);
    console.log('   - Ancestor Overflows:');
    if (Array.isArray(structure.ancestorOverflows)) {
      structure.ancestorOverflows.forEach((s, i) => console.log(`     ${i}: ${s}`));
    }
  });
});



