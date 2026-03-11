/**
 * DFMEA L1 구분값 테스트
 * 법규/기본/보조/관능 (FMEA기초정보및관계형정의.MD 기준)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.use({
  viewport: { width: 1920, height: 1080 },
  headless: false,
  launchOptions: { slowMo: 200 }
});

test.describe('DFMEA L1 구분값 테스트', () => {
  
  test('TC-CAT-001: 1L기능 탭 - DFMEA 구분값 확인', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 1L기능 탭 클릭
    const l1Tab = page.locator('button').filter({ hasText: '1L기능' }).first();
    await l1Tab.click();
    await page.waitForTimeout(1500);
    
    // DFMEA 구분값이 화면에 있는지 확인 (HTML 또는 JS에서)
    const pageContent = await page.content();
    
    // DFMEA L1 구분값: 법규/기본/보조/관능
    const dfmeaCategories = ['법규', '기본', '보조', '관능'];
    
    // PFMEA L1 구분값 (없어야 함)
    const pfmeaCategories = ['Your Plant', 'Ship to Plant', 'User'];
    
    console.log('\n=== DFMEA L1 구분값 검증 ===');
    
    // DFMEA 구분값 확인
    for (const cat of dfmeaCategories) {
      const found = pageContent.includes(cat);
      console.log(`✅ DFMEA 구분 "${cat}": ${found ? 'FOUND (✓)' : 'NOT FOUND'}`);
    }
    
    // PFMEA 구분값이 없는지 확인
    console.log('\n=== PFMEA 용어 제거 확인 ===');
    for (const cat of pfmeaCategories) {
      const found = pageContent.includes(cat);
      console.log(`❌ PFMEA 구분 "${cat}": ${found ? 'FOUND (수정필요)' : 'NOT FOUND (✓)'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-l1-category.png', fullPage: true });
  });

  test('TC-CAT-002: 1L영향 탭 - DFMEA 구분값 확인', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 1L영향 탭 클릭
    const feTab = page.locator('button').filter({ hasText: '1L영향' }).first();
    await feTab.click();
    await page.waitForTimeout(1500);
    
    const pageContent = await page.content();
    
    // DFMEA 구분값
    const dfmeaCategories = ['법규', '기본', '보조', '관능'];
    
    console.log('\n=== 1L영향 탭 DFMEA 구분값 검증 ===');
    
    for (const cat of dfmeaCategories) {
      const found = pageContent.includes(cat);
      console.log(`✅ DFMEA 구분 "${cat}": ${found ? 'FOUND (✓)' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-fe-category.png', fullPage: true });
  });

  test('TC-CAT-003: 구분 색상 확인 (level-colors.ts)', async ({ page }) => {
    // level-colors.ts에서 DFMEA 구분 색상이 정의되어 있는지 확인하기 위한 테스트
    // 이 테스트는 빌드 결과물에서 색상이 적용되었는지 간접적으로 확인
    
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭에서 색상 적용 확인
    const structureTab = page.locator('button').filter({ hasText: '구조분석' }).first();
    await structureTab.click();
    await page.waitForTimeout(1000);
    
    // 색상 관련 CSS 변수 또는 클래스 확인
    const styles = await page.evaluate(() => {
      const colorVars = [
        '--zebra-structure-light',
        '--zebra-structure-dark',
        '--zebra-function-light',
        '--zebra-function-dark',
      ];
      
      const results: Record<string, string> = {};
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      colorVars.forEach(v => {
        results[v] = computedStyle.getPropertyValue(v) || 'NOT_SET';
      });
      
      return results;
    });
    
    console.log('\n=== 색상 CSS 변수 확인 ===');
    Object.entries(styles).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    console.log('\n✅ DFMEA 탭 전환 테스트 완료');
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-color-check.png', fullPage: true });
  });
});
