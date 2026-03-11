/**
 * DFMEA 기능분석 ~ 고장분석 테스트
 * 1L기능, 2L기능, 3L기능 → 1L영향, 2L형태, 3L원인
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.use({
  viewport: { width: 1920, height: 1080 },
  headless: false,
  launchOptions: { slowMo: 200 }
});

test.describe('DFMEA 기능분석 ~ 고장분석 테스트', () => {
  
  test('TC-TAB-001: 구조분석 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭 클릭
    const structureTab = page.locator('button').filter({ hasText: '구조분석' }).first();
    await structureTab.click();
    await page.waitForTimeout(1000);
    
    const pageContent = await page.content();
    const terms = ['다음상위수준', '초점요소', '다음하위수준', '타입'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-structure.png', fullPage: true });
  });

  test('TC-TAB-002: 1L기능 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 1L기능 탭 클릭
    const l1Tab = page.locator('button').filter({ hasText: '1L기능' }).first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 1L기능 탭 클릭됨');
    } else {
      console.log('❌ 1L기능 탭 NOT VISIBLE');
    }
    
    const pageContent = await page.content();
    const terms = ['다음상위수준', '기능', '구분', 'Your Plant', 'Ship to Plant', 'User'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-function-l1.png', fullPage: true });
  });

  test('TC-TAB-003: 2L기능 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 2L기능 탭 클릭
    const l2Tab = page.locator('button').filter({ hasText: '2L기능' }).first();
    if (await l2Tab.isVisible()) {
      await l2Tab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 2L기능 탭 클릭됨');
    } else {
      console.log('❌ 2L기능 탭 NOT VISIBLE');
    }
    
    const pageContent = await page.content();
    const terms = ['초점요소', '기능', '요구사항'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-function-l2.png', fullPage: true });
  });

  test('TC-TAB-004: 3L기능 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 3L기능 탭 클릭
    const l3Tab = page.locator('button').filter({ hasText: '3L기능' }).first();
    if (await l3Tab.isVisible()) {
      await l3Tab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 3L기능 탭 클릭됨');
    } else {
      console.log('❌ 3L기능 탭 NOT VISIBLE');
    }
    
    const pageContent = await page.content();
    const terms = ['다음하위수준', '기능', '요구사항'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-function-l3.png', fullPage: true });
  });

  test('TC-TAB-005: 1L영향 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 1L영향 탭 클릭
    const feTab = page.locator('button').filter({ hasText: '1L영향' }).first();
    if (await feTab.isVisible()) {
      await feTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 1L영향 탭 클릭됨');
    } else {
      console.log('❌ 1L영향 탭 NOT VISIBLE');
    }
    
    const pageContent = await page.content();
    const terms = ['고장영향', 'FE', '심각도'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-failure-fe.png', fullPage: true });
  });

  test('TC-TAB-006: 2L형태 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 2L형태 탭 클릭
    const fmTab = page.locator('button').filter({ hasText: '2L형태' }).first();
    if (await fmTab.isVisible()) {
      await fmTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 2L형태 탭 클릭됨');
    } else {
      console.log('❌ 2L형태 탭 NOT VISIBLE');
    }
    
    const pageContent = await page.content();
    const terms = ['고장형태', 'FM'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-failure-fm.png', fullPage: true });
  });

  test('TC-TAB-007: 3L원인 탭 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 3L원인 탭 클릭
    const fcTab = page.locator('button').filter({ hasText: '3L원인' }).first();
    if (await fcTab.isVisible()) {
      await fcTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 3L원인 탭 클릭됨');
    } else {
      console.log('❌ 3L원인 탭 NOT VISIBLE');
    }
    
    const pageContent = await page.content();
    const terms = ['고장원인', 'FC'];
    
    for (const term of terms) {
      const found = pageContent.includes(term);
      console.log(`✅ ${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-tab-failure-fc.png', fullPage: true });
  });

  test('TC-FLOW-001: 전체 탭 흐름 테스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const tabs = [
      '구조분석',
      '1L기능', '2L기능', '3L기능',
      '1L영향', '2L형태', '3L원인',
      '고장연결'
    ];
    
    for (const tabName of tabs) {
      const tab = page.locator('button').filter({ hasText: tabName }).first();
      const isVisible = await tab.isVisible().catch(() => false);
      
      if (isVisible) {
        await tab.click();
        await page.waitForTimeout(800);
        console.log(`✅ ${tabName} 탭 클릭 완료`);
      } else {
        console.log(`❌ ${tabName} 탭 NOT VISIBLE`);
      }
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-flow-all-tabs.png', fullPage: true });
  });
});
