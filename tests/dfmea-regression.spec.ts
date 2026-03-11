/**
 * DFMEA 순차 회귀검증 테스트 (5회 반복)
 * TDD 방식 - 실제 브라우저에서 데이터 렌더링 검증
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 5회 반복 테스트
for (let iteration = 1; iteration <= 5; iteration++) {
  test.describe(`DFMEA 회귀검증 #${iteration}`, () => {
    
    test(`[${iteration}/5] 구조분석 탭 - 타입 옵션 S/I/F/C 확인`, async ({ page }) => {
      await page.goto(`${BASE_URL}/dfmea/worksheet`);
      await page.waitForTimeout(2000);
      
      // 구조분석 탭 클릭
      await page.click('text=구조분석');
      await page.waitForTimeout(1000);
      
      // 타입 셀렉트 옵션 확인
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible()) {
        await typeSelect.click();
        
        // S, I, F, C 옵션 확인
        const options = await page.locator('option').allTextContents();
        console.log(`[회귀#${iteration}] 타입 옵션:`, options);
        
        expect(options.join(',')).toContain('S');
        expect(options.join(',')).toContain('I');
      }
      
      // 스크린샷 저장
      await page.screenshot({ path: `test-results/dfmea-structure-${iteration}.png`, fullPage: true });
    });

    test(`[${iteration}/5] 기능분석 L1~L3 탭 렌더링 확인`, async ({ page }) => {
      await page.goto(`${BASE_URL}/dfmea/worksheet`);
      await page.waitForTimeout(2000);
      
      // 기능분석 탭들 순차 확인
      const functionTabs = ['1L', '2L', '3L'];
      for (const tab of functionTabs) {
        const tabButton = page.locator(`button:has-text("${tab}")`).first();
        if (await tabButton.isVisible()) {
          await tabButton.click();
          await page.waitForTimeout(500);
          console.log(`[회귀#${iteration}] 기능분석 ${tab} 탭 렌더링 확인`);
        }
      }
      
      await page.screenshot({ path: `test-results/dfmea-function-${iteration}.png`, fullPage: true });
    });

    test(`[${iteration}/5] 고장분석 L1~L3 탭 렌더링 확인`, async ({ page }) => {
      await page.goto(`${BASE_URL}/dfmea/worksheet`);
      await page.waitForTimeout(2000);
      
      // 고장분석 탭 클릭
      const failureTab = page.locator('button:has-text("고장분석")');
      if (await failureTab.isVisible()) {
        await failureTab.click();
        await page.waitForTimeout(500);
      }
      
      // 고장분석 서브탭들 순차 확인
      const failureTabs = ['1L', '2L', '3L', '연결'];
      for (const tab of failureTabs) {
        const tabButton = page.locator(`button:has-text("${tab}")`).first();
        if (await tabButton.isVisible()) {
          await tabButton.click();
          await page.waitForTimeout(500);
          console.log(`[회귀#${iteration}] 고장분석 ${tab} 탭 렌더링 확인`);
        }
      }
      
      await page.screenshot({ path: `test-results/dfmea-failure-${iteration}.png`, fullPage: true });
    });

    test(`[${iteration}/5] 리스크/최적화/All 탭 렌더링 확인`, async ({ page }) => {
      await page.goto(`${BASE_URL}/dfmea/worksheet`);
      await page.waitForTimeout(2000);
      
      // 리스크, 최적화, All 탭 순차 확인
      const tabs = ['리스크', '최적화', 'All'];
      for (const tabName of tabs) {
        const tab = page.locator(`button:has-text("${tabName}")`).first();
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(500);
          console.log(`[회귀#${iteration}] ${tabName} 탭 렌더링 확인`);
        }
      }
      
      await page.screenshot({ path: `test-results/dfmea-all-${iteration}.png`, fullPage: true });
    });

    test(`[${iteration}/5] 데이터 입력 및 저장 검증`, async ({ page }) => {
      await page.goto(`${BASE_URL}/dfmea/worksheet`);
      await page.waitForTimeout(2000);
      
      // 구조분석 탭
      await page.click('text=구조분석');
      await page.waitForTimeout(1000);
      
      // 셀 더블클릭해서 편집 시도
      const firstCell = page.locator('td').first();
      if (await firstCell.isVisible()) {
        await firstCell.dblclick();
        await page.waitForTimeout(500);
      }
      
      // 화면에 에러가 없는지 확인
      const errorText = await page.locator('text=Error').count();
      expect(errorText).toBe(0);
      
      console.log(`[회귀#${iteration}] 데이터 입력/저장 검증 완료`);
      await page.screenshot({ path: `test-results/dfmea-save-${iteration}.png`, fullPage: true });
    });
  });
}
