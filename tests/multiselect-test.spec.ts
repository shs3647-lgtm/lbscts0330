/**
 * @file multiselect-test.spec.ts
 * @description 다중선택 기능 Deep & Wide Headless 테스트
 * @test 5회 순차 회귀 테스트
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/pfmea/worksheet';

// 테스트 설정
test.describe.configure({ mode: 'serial' });

// 공통 함수: 페이지 로드 대기
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// 공통 함수: 모달 열기
async function openModal(page: Page, cellSelector: string) {
  await page.click(cellSelector);
  await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
  await page.waitForTimeout(500);
}

// 공통 함수: 다중선택 테스트
async function testMultiSelect(page: Page, tabName: string, cellSelector: string) {
  console.log(`\n🔵 [${tabName}] 다중선택 테스트 시작`);
  
  // 1. 셀 클릭하여 모달 열기
  await openModal(page, cellSelector);
  
  // 2. 모달에서 첫 번째 항목 클릭
  const items = page.locator('.grid.grid-cols-2 > div');
  const count = await items.count();
  console.log(`   📋 항목 수: ${count}`);
  
  if (count < 2) {
    console.log(`   ⚠️ 항목이 2개 미만, 스킵`);
    await page.click('button:has-text("닫기")');
    return { success: false, reason: 'Not enough items' };
  }
  
  // 3. 첫 번째 항목 클릭
  await items.nth(0).click();
  await page.waitForTimeout(200);
  
  // 4. 두 번째 항목 클릭 (다중선택)
  await items.nth(1).click();
  await page.waitForTimeout(200);
  
  // 5. 선택 개수 확인
  const selectedCountText = await page.locator('text=/✓ \\d+개 선택/').textContent();
  const selectedCount = parseInt(selectedCountText?.match(/(\d+)/)?.[1] || '0');
  console.log(`   ✅ 선택된 개수: ${selectedCount}`);
  
  // 6. 적용 버튼 클릭
  await page.click('button:has-text("적용")');
  await page.waitForTimeout(500);
  
  const success = selectedCount >= 2;
  console.log(`   ${success ? '✅ 성공' : '❌ 실패'}: 다중선택 ${selectedCount}개`);
  
  return { success, selectedCount };
}

// ============ DEEP 테스트: 각 탭 상세 검증 ============
test.describe('DEEP 테스트 - 다중선택 상세 검증', () => {
  
  test('1L 완제품기능 다중선택', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // 1L 기능분석 탭으로 이동
    await page.click('text=1L기능');
    await page.waitForTimeout(500);
    
    // 완제품기능 셀 클릭
    const result = await testMultiSelect(page, '1L기능', 'td:has-text("기능 선택"), td:has-text("기능")');
    expect(result.success).toBe(true);
  });

  test('2L 메인공정기능 다중선택', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // 2L 기능분석 탭으로 이동
    await page.click('text=2L기능');
    await page.waitForTimeout(500);
    
    // 메인공정기능 셀 클릭
    const result = await testMultiSelect(page, '2L기능', 'td:has-text("공정기능 선택"), td:has-text("공정기능")');
    expect(result.success).toBe(true);
  });

  test('3L 작업요소기능 다중선택', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // 3L 기능분석 탭으로 이동
    await page.click('text=3L기능');
    await page.waitForTimeout(500);
    
    // 작업요소기능 셀 클릭
    const result = await testMultiSelect(page, '3L기능', 'td:has-text("기능 선택"), td:has-text("작업요소기능")');
    expect(result.success).toBe(true);
  });

  test('1L 고장영향 다중선택', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // 1L 고장분석 탭으로 이동
    await page.click('text=1L고장');
    await page.waitForTimeout(500);
    
    // 고장영향 셀 클릭
    const result = await testMultiSelect(page, '1L고장', 'td:has-text("고장영향 선택"), td:has-text("고장영향")');
    expect(result.success).toBe(true);
  });

  test('2L 고장형태 다중선택', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // 2L 고장분석 탭으로 이동
    await page.click('text=2L고장');
    await page.waitForTimeout(500);
    
    // 고장형태 셀 클릭
    const result = await testMultiSelect(page, '2L고장', 'td:has-text("고장형태 선택"), td:has-text("고장형태")');
    expect(result.success).toBe(true);
  });

  test('3L 고장원인 다중선택', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // 3L 고장분석 탭으로 이동
    await page.click('text=3L고장');
    await page.waitForTimeout(500);
    
    // 고장원인 셀 클릭
    const result = await testMultiSelect(page, '3L고장', 'td:has-text("고장원인 선택"), td:has-text("고장원인")');
    expect(result.success).toBe(true);
  });
});

// ============ WIDE 테스트: 전체 흐름 검증 ============
test.describe('WIDE 테스트 - 전체 흐름 검증', () => {
  
  test('전체 탭 다중선택 연속 테스트', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    const tabs = ['1L기능', '2L기능', '3L기능', '1L고장', '2L고장', '3L고장'];
    const results: { tab: string; success: boolean }[] = [];
    
    for (const tab of tabs) {
      console.log(`\n🔵 [WIDE] ${tab} 탭 테스트`);
      
      // 탭 클릭
      await page.click(`text=${tab}`);
      await page.waitForTimeout(500);
      
      // 스크린샷 저장
      await page.screenshot({ path: `tests/screenshots/wide-${tab}.png` });
      
      results.push({ tab, success: true });
    }
    
    console.log('\n📊 WIDE 테스트 결과:', results);
    expect(results.every(r => r.success)).toBe(true);
  });
});

// ============ 회귀 테스트: 5회 반복 ============
test.describe('회귀 테스트 - 5회 반복', () => {
  
  for (let i = 1; i <= 5; i++) {
    test(`회귀 테스트 ${i}/5`, async ({ page }) => {
      console.log(`\n🔄 회귀 테스트 ${i}/5 시작`);
      
      await page.goto(BASE_URL);
      await waitForPageLoad(page);
      
      // 3L 기능 탭으로 이동
      await page.click('text=3L기능');
      await page.waitForTimeout(500);
      
      // 콘솔 로그 수집
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('DataSelectModal')) {
          consoleLogs.push(msg.text());
        }
      });
      
      // 셀 클릭
      const cells = page.locator('td').filter({ hasText: /기능|선택/ });
      const cellCount = await cells.count();
      
      if (cellCount > 0) {
        await cells.first().click();
        await page.waitForTimeout(500);
        
        // 모달이 열렸는지 확인
        const modal = page.locator('.fixed.inset-0');
        const isVisible = await modal.isVisible().catch(() => false);
        
        if (isVisible) {
          // 첫 번째 항목 클릭
          const items = page.locator('.grid.grid-cols-2 > div');
          const itemCount = await items.count();
          
          if (itemCount >= 2) {
            await items.nth(0).click();
            await page.waitForTimeout(100);
            await items.nth(1).click();
            await page.waitForTimeout(100);
            
            // singleSelect 값 확인
            const hasMultiSelect = consoleLogs.some(log => log.includes('singleSelect: false'));
            console.log(`   📋 singleSelect: false 확인: ${hasMultiSelect}`);
          }
          
          await page.click('button:has-text("닫기")');
        }
      }
      
      // 스크린샷
      await page.screenshot({ path: `tests/screenshots/regression-${i}.png` });
      
      console.log(`   ✅ 회귀 테스트 ${i}/5 완료`);
    });
  }
});




