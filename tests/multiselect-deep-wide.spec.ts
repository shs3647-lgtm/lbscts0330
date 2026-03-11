/**
 * @file multiselect-deep-wide.spec.ts
 * @description 다중선택 Deep & Wide 테스트 - 모든 탭 검증
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/pfmea/worksheet';

test.describe.configure({ mode: 'serial' });

// 탭 정보
const TABS = [
  { name: '1L기능', selector: '1L기능' },
  { name: '2L기능', selector: '2L기능' },
  { name: '3L기능', selector: '3L기능' },
  { name: '1L영향', selector: '1L영향' },
  { name: '2L형태', selector: '2L형태' },
  { name: '3L원인', selector: '3L원인' },
];

// DEEP 테스트: 각 탭 상세 검증
test.describe('DEEP 테스트 - 모든 탭 다중선택', () => {
  for (const tab of TABS) {
    test(`${tab.name} 다중선택 검증`, async ({ page }) => {
      console.log(`\n🔵 [DEEP] ${tab.name} 테스트 시작`);
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 탭 클릭
      const tabButton = page.locator('button, a, div, span').filter({ hasText: tab.selector }).first();
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(1000);
        console.log(`   ✅ ${tab.name} 탭 클릭 완료`);
      } else {
        console.log(`   ⚠️ ${tab.name} 탭 버튼을 찾을 수 없음`);
        return;
      }
      
      // 스크린샷
      await page.screenshot({ path: `tests/screenshots/deep-${tab.name}-1.png`, fullPage: true });
      
      // 클릭 가능한 셀 찾기
      const clickableCells = page.locator('td').filter({ hasText: /선택|클릭|추가/ });
      const cellCount = await clickableCells.count();
      console.log(`   📋 클릭 가능한 셀 수: ${cellCount}`);
      
      if (cellCount > 0) {
        await clickableCells.first().click();
        await page.waitForTimeout(1000);
        
        // 모달 확인
        const modal = page.locator('.fixed.inset-0');
        const isModalVisible = await modal.isVisible().catch(() => false);
        console.log(`   📋 모달 열림: ${isModalVisible}`);
        
        if (isModalVisible) {
          // 스크린샷: 모달 열림
          await page.screenshot({ path: `tests/screenshots/deep-${tab.name}-2-modal.png`, fullPage: true });
          
          // 그리드 항목들
          const gridItems = page.locator('.grid.grid-cols-2 > div');
          const itemCount = await gridItems.count();
          console.log(`   📋 그리드 항목 수: ${itemCount}`);
          
          if (itemCount >= 2) {
            // 첫 번째 항목 클릭
            await gridItems.nth(0).click();
            await page.waitForTimeout(300);
            
            // 두 번째 항목 클릭 (다중선택)
            await gridItems.nth(1).click();
            await page.waitForTimeout(300);
            
            // 선택 개수 확인
            const selectCountText = await page.locator('text=/\\d+개 선택/').textContent().catch(() => '0');
            const selectedCount = parseInt(selectCountText?.match(/(\d+)/)?.[1] || '0');
            console.log(`   📋 선택된 개수: ${selectedCount}`);
            
            // 스크린샷: 다중선택 완료
            await page.screenshot({ path: `tests/screenshots/deep-${tab.name}-3-selected.png`, fullPage: true });
            
            // 다중선택 검증
            expect(selectedCount).toBeGreaterThanOrEqual(2);
            
            // 닫기 버튼 클릭
            const closeBtn = page.locator('button').filter({ hasText: /닫기|취소/i }).first();
            if (await closeBtn.isVisible()) {
              await closeBtn.click();
            }
          }
        }
      }
      
      console.log(`   ✅ ${tab.name} 테스트 완료`);
    });
  }
});

// WIDE 테스트: 전체 흐름 연속 검증
test.describe('WIDE 테스트 - 전체 흐름 검증', () => {
  test('모든 탭 연속 다중선택', async ({ page }) => {
    console.log('\n🔵 [WIDE] 전체 탭 연속 테스트 시작');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const results: { tab: string; success: boolean; count: number }[] = [];
    
    for (const tab of TABS) {
      console.log(`\n   📋 ${tab.name} 탭 테스트...`);
      
      // 탭 클릭
      const tabButton = page.locator('button, a, div, span').filter({ hasText: tab.selector }).first();
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(1000);
        
        // 클릭 가능한 셀 찾기
        const clickableCells = page.locator('td').filter({ hasText: /선택|클릭|추가/ });
        const cellCount = await clickableCells.count();
        
        if (cellCount > 0) {
          await clickableCells.first().click();
          await page.waitForTimeout(800);
          
          const modal = page.locator('.fixed.inset-0');
          if (await modal.isVisible().catch(() => false)) {
            const gridItems = page.locator('.grid.grid-cols-2 > div');
            const itemCount = await gridItems.count();
            
            if (itemCount >= 2) {
              await gridItems.nth(0).click();
              await page.waitForTimeout(200);
              await gridItems.nth(1).click();
              await page.waitForTimeout(200);
              
              const selectCountText = await page.locator('text=/\\d+개 선택/').textContent().catch(() => '0');
              const selectedCount = parseInt(selectCountText?.match(/(\d+)/)?.[1] || '0');
              
              results.push({ tab: tab.name, success: selectedCount >= 2, count: selectedCount });
              
              const closeBtn = page.locator('button').filter({ hasText: /닫기|취소/i }).first();
              if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(300);
              }
            }
          }
        }
      }
    }
    
    console.log('\n📊 WIDE 테스트 결과:');
    results.forEach(r => {
      console.log(`   ${r.success ? '✅' : '❌'} ${r.tab}: ${r.count}개 선택`);
    });
    
    // 모든 탭에서 다중선택 성공 검증
    const allSuccess = results.every(r => r.success);
    expect(allSuccess).toBe(true);
  });
});

// 회귀 테스트: 5회 반복
test.describe('회귀 테스트 - 5회 순차 반복', () => {
  for (let round = 1; round <= 5; round++) {
    test(`회귀 ${round}/5 - 3L기능 다중선택`, async ({ page }) => {
      console.log(`\n🔄 회귀 테스트 ${round}/5 시작`);
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 3L기능 탭 클릭
      const tabButton = page.locator('button, a, div, span').filter({ hasText: '3L기능' }).first();
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(1000);
      }
      
      // 클릭 가능한 셀
      const clickableCells = page.locator('td').filter({ hasText: /선택|클릭|추가/ });
      const cellCount = await clickableCells.count();
      
      if (cellCount > 0) {
        await clickableCells.first().click();
        await page.waitForTimeout(800);
        
        const modal = page.locator('.fixed.inset-0');
        if (await modal.isVisible().catch(() => false)) {
          const gridItems = page.locator('.grid.grid-cols-2 > div');
          const itemCount = await gridItems.count();
          
          if (itemCount >= 2) {
            await gridItems.nth(0).click();
            await page.waitForTimeout(200);
            await gridItems.nth(1).click();
            await page.waitForTimeout(200);
            
            const selectCountText = await page.locator('text=/\\d+개 선택/').textContent().catch(() => '0');
            const selectedCount = parseInt(selectCountText?.match(/(\d+)/)?.[1] || '0');
            
            console.log(`   📋 선택된 개수: ${selectedCount}`);
            expect(selectedCount).toBeGreaterThanOrEqual(2);
            
            const closeBtn = page.locator('button').filter({ hasText: /닫기|취소/i }).first();
            if (await closeBtn.isVisible()) {
              await closeBtn.click();
            }
          }
        }
      }
      
      // 스크린샷
      await page.screenshot({ path: `tests/screenshots/regression-round${round}.png`, fullPage: true });
      
      console.log(`   ✅ 회귀 테스트 ${round}/5 완료`);
    });
  }
});




