/**
 * @file worksheet-complete.spec.ts
 * @description 구조분석부터 고장원인 분석까지 코드 완전성 검증 (TDD)
 * @version 1.1.0
 */

import { test, expect } from '@playwright/test';

const BASE_URL = `${process.env.TEST_BASE_URL ?? 'http://localhost:3001'}/pfmea/worksheet`;

// 탭 레이블 상수 (ANALYSIS_TABS에서 가져옴)
const TAB_LABELS = {
  structure: '구조분석',
  functionL1: '1L기능',
  functionL2: '2L기능',
  functionL3: '3L기능',
  failureL1: '1L영향',
  failureL2: '2L형태',
  failureL3: '3L원인',
  failureLink: '고장연결',
};

test.describe('PFMEA 워크시트 완전성 검증 (TDD)', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  // ========== 1. 구조분석 탭 테스트 ==========
  test.describe('1. 구조분석 (Structure)', () => {
    
    test('1.1 구조분석 탭이 표시되고 클릭 가능해야 함', async ({ page }) => {
      const tab = page.locator(`button:has-text("${TAB_LABELS.structure}")`);
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForTimeout(500);
    });

    test('1.2 메인공정 테이블이 표시되어야 함', async ({ page }) => {
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('1.3 우측 패널 영역이 표시되어야 함', async ({ page }) => {
      // 우측 트리뷰/패널 영역 확인 - 클래스명이 다를 수 있으므로 유연하게 검색
      const rightPanel = page.locator('div.flex, div.grid').nth(1);
      await expect(rightPanel).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 2. 1L 기능분석 탭 테스트 ==========
  test.describe('2. 1L 기능분석', () => {
    
    test('2.1 1L기능 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.functionL1}")`);
      await page.waitForTimeout(800);
      
      // 테이블이 표시되어야 함
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('2.2 테이블 헤더가 존재해야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.functionL1}")`);
      await page.waitForTimeout(800);
      
      // th 요소들이 있어야 함
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 3. 2L 기능분석 탭 테스트 ==========
  test.describe('3. 2L 기능분석', () => {
    
    test('3.1 2L기능 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.functionL2}")`);
      await page.waitForTimeout(800);
      
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('3.2 테이블 헤더가 존재해야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.functionL2}")`);
      await page.waitForTimeout(800);
      
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 4. 3L 기능분석 탭 테스트 ==========
  test.describe('4. 3L 기능분석', () => {
    
    test('4.1 3L기능 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.functionL3}")`);
      await page.waitForTimeout(800);
      
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('4.2 테이블 헤더가 존재해야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.functionL3}")`);
      await page.waitForTimeout(800);
      
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 5. 1L 고장영향 분석 탭 테스트 ==========
  test.describe('5. 1L 고장영향 분석', () => {
    
    test('5.1 1L영향 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureL1}")`);
      await page.waitForTimeout(800);
      
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('5.2 테이블 헤더가 존재해야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureL1}")`);
      await page.waitForTimeout(800);
      
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 6. 2L 고장형태 분석 탭 테스트 ==========
  test.describe('6. 2L 고장형태 분석', () => {
    
    test('6.1 2L형태 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureL2}")`);
      await page.waitForTimeout(800);
      
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('6.2 테이블 헤더가 존재해야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureL2}")`);
      await page.waitForTimeout(800);
      
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 7. 3L 고장원인 분석 탭 테스트 ==========
  test.describe('7. 3L 고장원인 분석', () => {
    
    test('7.1 3L원인 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureL3}")`);
      await page.waitForTimeout(800);
      
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('7.2 테이블 헤더가 존재해야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureL3}")`);
      await page.waitForTimeout(800);
      
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 8. 고장연결 탭 테스트 ==========
  test.describe('8. 고장연결', () => {
    
    test('8.1 고장연결 탭 클릭 및 표시 확인', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureLink}")`);
      await page.waitForTimeout(1000);
      
      // 고장연결 영역이 표시되어야 함
      const content = page.locator('table, [class*="flex"]').first();
      await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('8.2 테이블이 표시되어야 함', async ({ page }) => {
      await page.click(`button:has-text("${TAB_LABELS.failureLink}")`);
      await page.waitForTimeout(1000);
      
      const tables = page.locator('table');
      await expect(tables.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 9. 전체 탭 순회 - 크래시 없음 검증 ==========
  test.describe('9. 전체 탭 순회 테스트', () => {
    
    test('9.1 모든 탭을 순회해도 크래시가 없어야 함', async ({ page }) => {
      let crashed = false;
      page.on('crash', () => { crashed = true; });
      
      const tabs = Object.values(TAB_LABELS);
      for (const tabLabel of tabs) {
        await page.click(`button:has-text("${tabLabel}")`);
        await page.waitForTimeout(600);
      }
      
      expect(crashed).toBe(false);
    });

    test('9.2 모든 탭 순회 후 치명적 에러 없어야 함', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      const tabs = Object.values(TAB_LABELS);
      for (const tabLabel of tabs) {
        await page.click(`button:has-text("${tabLabel}")`);
        await page.waitForTimeout(500);
      }
      
      // 치명적 에러만 필터링 (일반 경고 제외)
      const criticalErrors = errors.filter(e => 
        e.includes('Uncaught') || 
        e.includes('is not defined') ||
        e.includes('Cannot read') ||
        e.includes('Cannot access') ||
        e.includes('TypeError') ||
        e.includes('ReferenceError')
      );
      
      if (criticalErrors.length > 0) {
        console.log('Critical errors found:', criticalErrors);
      }
      
      expect(criticalErrors.length).toBe(0);
    });
  });

  // ========== 10. 데이터 로드 테스트 ==========
  test.describe('10. 데이터 및 UI 무결성', () => {
    
    test('10.1 페이지가 정상적으로 렌더링되어야 함', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('10.2 최소 하나의 버튼이 클릭 가능해야 함', async ({ page }) => {
      const buttons = page.locator('button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
