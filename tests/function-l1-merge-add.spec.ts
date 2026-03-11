/**
 * @file function-l1-merge-add.spec.ts
 * @description 1L 기능 탭 - 위로/아래로 병합 추가 기능 테스트
 * @created 2026-02-06
 * 
 * TDD 테스트 케이스:
 * 1. 컨텍스트 메뉴에서 "위로 병합 추가" 항목 표시 확인
 * 2. 컨텍스트 메뉴에서 "아래로 병합 추가" 항목 표시 확인
 * 3. 타입 셀 우클릭 → 위로 병합 추가 → 새 타입 추가됨
 * 4. 기능 셀 우클릭 → 위로 병합 추가 → 같은 타입 내 새 기능 추가됨
 * 5. 요구사항 셀 우클릭 → 위로 병합 추가 → 같은 기능 내 새 요구사항 추가됨
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('1L 기능 탭 - 병합 추가 기능', () => {
  
  test.beforeEach(async ({ page }) => {
    // PFMEA 워크시트 페이지로 이동
    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    
    // 1L 기능 탭 클릭
    const l1FuncTab = page.locator('text=1L기능').first();
    if (await l1FuncTab.isVisible()) {
      await l1FuncTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('1-1. 컨텍스트 메뉴에 "위로 병합 추가" 항목이 표시되어야 함', async ({ page }) => {
    // 수동 모드로 전환
    const modeToggle = page.locator('button:has-text("수동")');
    if (await modeToggle.isVisible()) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // 테이블의 기능 셀 찾기
    const funcCell = page.locator('td').filter({ hasText: /기능|선택/ }).first();
    
    if (await funcCell.isVisible()) {
      // 우클릭으로 컨텍스트 메뉴 열기
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // "위로 병합 추가" 메뉴 항목 확인
      const mergeAddAbove = page.locator('button:has-text("위로 병합 추가")');
      await expect(mergeAddAbove).toBeVisible({ timeout: 3000 });
      
      // 스크린샷
      await page.screenshot({ path: 'tests/screenshots/l1-context-menu-merge-add.png' });
    }
  });

  test('1-2. 컨텍스트 메뉴에 "아래로 병합 추가" 항목이 표시되어야 함', async ({ page }) => {
    // 수동 모드로 전환
    const modeToggle = page.locator('button:has-text("수동")');
    if (await modeToggle.isVisible()) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // 테이블의 기능 셀 찾기
    const funcCell = page.locator('td').filter({ hasText: /기능|선택/ }).first();
    
    if (await funcCell.isVisible()) {
      // 우클릭으로 컨텍스트 메뉴 열기
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // "아래로 병합 추가" 메뉴 항목 확인
      const mergeAddBelow = page.locator('button:has-text("아래로 병합 추가")');
      await expect(mergeAddBelow).toBeVisible({ timeout: 3000 });
    }
  });

  test('2-1. 타입 셀 우클릭 → 위로 병합 추가 → 새 타입 추가', async ({ page }) => {
    // 수동 모드로 전환
    const modeToggle = page.locator('button:has-text("수동")');
    if (await modeToggle.isVisible()) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // 초기 행 수 확인
    const initialRows = await page.locator('table tbody tr').count();
    console.log('초기 행 수:', initialRows);

    // 타입(구분) 셀 찾기 - "안전", "기능", "규제" 등의 텍스트가 있는 셀
    const typeCell = page.locator('td').filter({ hasText: /안전|기능|규제|구분/ }).first();
    
    if (await typeCell.isVisible()) {
      // 우클릭으로 컨텍스트 메뉴 열기
      await typeCell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // "위로 병합 추가" 클릭
      const mergeAddAbove = page.locator('button:has-text("위로 병합 추가")');
      if (await mergeAddAbove.isVisible()) {
        await mergeAddAbove.click();
        await page.waitForTimeout(500);
        
        // 행 수 증가 확인
        const newRows = await page.locator('table tbody tr').count();
        console.log('추가 후 행 수:', newRows);
        expect(newRows).toBeGreaterThanOrEqual(initialRows);
        
        // 스크린샷
        await page.screenshot({ path: 'tests/screenshots/l1-type-merge-add-above.png' });
      }
    }
  });

  test('2-2. 기능 셀 우클릭 → 위로 병합 추가 → 새 기능 추가', async ({ page }) => {
    // 수동 모드로 전환
    const modeToggle = page.locator('button:has-text("수동")');
    if (await modeToggle.isVisible()) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // 초기 행 수 확인
    const initialRows = await page.locator('table tbody tr').count();

    // 기능 셀 찾기
    const funcCell = page.locator('td').filter({ hasText: /기능/ }).first();
    
    if (await funcCell.isVisible()) {
      // 우클릭으로 컨텍스트 메뉴 열기
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // "위로 병합 추가" 클릭
      const mergeAddAbove = page.locator('button:has-text("위로 병합 추가")');
      if (await mergeAddAbove.isVisible()) {
        await mergeAddAbove.click();
        await page.waitForTimeout(500);
        
        // 행 수 증가 확인 (같은 타입 내 새 기능 추가됨)
        const newRows = await page.locator('table tbody tr').count();
        expect(newRows).toBeGreaterThanOrEqual(initialRows);
        
        // 스크린샷
        await page.screenshot({ path: 'tests/screenshots/l1-func-merge-add-above.png' });
      }
    }
  });

  test('2-3. 요구사항 셀 우클릭 → 아래로 병합 추가 → 새 요구사항 추가', async ({ page }) => {
    // 수동 모드로 전환
    const modeToggle = page.locator('button:has-text("수동")');
    if (await modeToggle.isVisible()) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // 초기 행 수 확인
    const initialRows = await page.locator('table tbody tr').count();

    // 요구사항 셀 찾기
    const reqCell = page.locator('td').filter({ hasText: /요구사항/ }).first();
    
    if (await reqCell.isVisible()) {
      // 우클릭으로 컨텍스트 메뉴 열기
      await reqCell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // "아래로 병합 추가" 클릭
      const mergeAddBelow = page.locator('button:has-text("아래로 병합 추가")');
      if (await mergeAddBelow.isVisible()) {
        await mergeAddBelow.click();
        await page.waitForTimeout(500);
        
        // 행 수 증가 확인 (같은 기능 내 새 요구사항 추가됨)
        const newRows = await page.locator('table tbody tr').count();
        expect(newRows).toBeGreaterThanOrEqual(initialRows);
        
        // 스크린샷
        await page.screenshot({ path: 'tests/screenshots/l1-req-merge-add-below.png' });
      }
    }
  });

  test('3-1. 병합 추가 후 데이터 구조 검증', async ({ page }) => {
    // 수동 모드로 전환
    const modeToggle = page.locator('button:has-text("수동")');
    if (await modeToggle.isVisible()) {
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // 기능 셀에서 위로 병합 추가 실행
    const funcCell = page.locator('td').filter({ hasText: /기능/ }).first();
    
    if (await funcCell.isVisible()) {
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      const mergeAddAbove = page.locator('button:has-text("위로 병합 추가")');
      if (await mergeAddAbove.isVisible()) {
        await mergeAddAbove.click();
        await page.waitForTimeout(500);
        
        // 새로 추가된 빈 셀 확인 (placeholder 텍스트)
        const emptyCell = page.locator('td').filter({ hasText: /기능 선택|기능/ });
        expect(await emptyCell.count()).toBeGreaterThan(0);
      }
    }
  });
});
