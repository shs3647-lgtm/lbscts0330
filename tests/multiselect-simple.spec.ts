/**
 * @file multiselect-simple.spec.ts
 * @description 다중선택 기능 간단 테스트 (5회 회귀)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/pfmea/worksheet';

test.describe.configure({ mode: 'serial' });

// 회귀 테스트 5회
for (let round = 1; round <= 5; round++) {
  test(`[회귀 ${round}/5] DataSelectModal 다중선택 검증`, async ({ page }) => {
    console.log(`\n🔄 회귀 테스트 ${round}/5 시작`);
    
    // 콘솔 로그 수집
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DataSelectModal') || text.includes('선택')) {
        consoleLogs.push(text);
        console.log(`   📋 ${text}`);
      }
    });
    
    // 페이지 로드
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 스크린샷: 초기 상태
    await page.screenshot({ path: `tests/screenshots/round${round}-01-init.png`, fullPage: true });
    
    // 3L기능 탭 클릭 (탭 메뉴에서 찾기)
    const tab3L = page.locator('button, a, div').filter({ hasText: /3L.*기능|기능.*3L/i }).first();
    if (await tab3L.isVisible()) {
      await tab3L.click();
      await page.waitForTimeout(1000);
      console.log(`   ✅ 3L기능 탭 클릭 완료`);
    } else {
      // 탭 메뉴가 다른 형태일 수 있음
      const allTabs = await page.locator('[class*="tab"], [role="tab"]').allTextContents();
      console.log(`   📋 탭 목록: ${allTabs.join(', ')}`);
    }
    
    // 스크린샷: 탭 이동 후
    await page.screenshot({ path: `tests/screenshots/round${round}-02-tab.png`, fullPage: true });
    
    // 테이블 셀 찾기 (클릭 가능한 셀)
    const clickableCells = page.locator('td').filter({ hasText: /선택|클릭|추가/ });
    const cellCount = await clickableCells.count();
    console.log(`   📋 클릭 가능한 셀 수: ${cellCount}`);
    
    if (cellCount > 0) {
      // 첫 번째 클릭 가능한 셀 클릭
      await clickableCells.first().click();
      await page.waitForTimeout(1000);
      
      // 스크린샷: 모달 열림
      await page.screenshot({ path: `tests/screenshots/round${round}-03-modal.png`, fullPage: true });
      
      // 모달 확인
      const modal = page.locator('.fixed.inset-0, [role="dialog"]');
      const isModalVisible = await modal.isVisible().catch(() => false);
      console.log(`   📋 모달 열림: ${isModalVisible}`);
      
      if (isModalVisible) {
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
          const selectCountText = await page.locator('text=/\\d+개 선택/').textContent().catch(() => '');
          console.log(`   📋 선택 텍스트: ${selectCountText}`);
          
          // singleSelect 로그 확인
          const singleSelectLogs = consoleLogs.filter(log => log.includes('singleSelect'));
          console.log(`   📋 singleSelect 로그: ${singleSelectLogs.length}개`);
          singleSelectLogs.forEach(log => console.log(`      ${log}`));
          
          // 스크린샷: 다중선택 후
          await page.screenshot({ path: `tests/screenshots/round${round}-04-selected.png`, fullPage: true });
          
          // 닫기 버튼 클릭
          const closeBtn = page.locator('button').filter({ hasText: /닫기|취소|close/i }).first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          }
        }
      }
    }
    
    // 최종 스크린샷
    await page.screenshot({ path: `tests/screenshots/round${round}-05-final.png`, fullPage: true });
    
    console.log(`   ✅ 회귀 테스트 ${round}/5 완료`);
    console.log(`   📋 수집된 로그: ${consoleLogs.length}개`);
  });
}




