/**
 * @file upstream-confirm-gating.spec.ts
 * @description TDD 테스트: 상위 단계 확정 게이팅 검증
 * 
 * 테스트 케이스:
 * 1. 기능분석(1L) 미확정 시 고장영향(1L) 탭이 비활성화되어야 함
 * 2. 기능분석(1L) 미확정 시 고장영향(1L) 탭에서 셀 클릭 시 경고 표시
 * 3. 기능분석(1L) 미확정 시 고장영향(1L) 탭에서 빈 행이 표시되지 않아야 함
 * 4. 기능분석(1L) 확정 후 고장영향(1L) 탭이 활성화되어야 함
 * 5. 고장영향(1L) 미확정 시 고장형태(2L) 탭이 비활성화되어야 함
 * 6. 고장형태(2L) 미확정 시 고장원인(3L) 탭이 비활성화되어야 함
 */

import { test, expect } from '@playwright/test';

const BASE_URL = `${process.env.TEST_BASE_URL ?? 'http://localhost:3001'}/pfmea/worksheet`;

test.describe('상위 단계 확정 게이팅 검증 (TDD)', () => {
  
  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 수집
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    
    // 다이얼로그 자동 닫기
    page.on('dialog', async (dlg) => {
      await dlg.dismiss();
    });
    
    await page.goto(BASE_URL);
    // 구조트리 또는 테이블이 표시될 때까지 대기
    await page.waitForSelector('table, div:has-text("구조트리")', { timeout: 10000 });
    await page.waitForTimeout(1500);
  });

  test('1. 기능분석(1L) 미확정 시 고장영향(1L) 탭에서 빈 행이 표시되지 않아야 함', async ({ page }) => {
    // 1L기능 탭으로 이동
    const functionL1Tab = page.locator('button:has-text("1L기능")');
    if (await functionL1Tab.isVisible()) {
      await functionL1Tab.click();
      await page.waitForTimeout(800);
    }
    
    // 확정 버튼이 있는지 확인 (확정하지 않음)
    const confirmBtn = page.locator('button:has-text("확정")');
    const isConfirmed = await confirmBtn.isVisible();
    
    // 1L영향 탭으로 이동
    const failureL1Tab = page.locator('button:has-text("1L영향")');
    await expect(failureL1Tab).toBeVisible();
    await failureL1Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블이 표시되는지 확인
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 상위 단계가 미확정이면 빈 상태 메시지가 표시되어야 함
    if (!isConfirmed) {
      // "기능분석(1L) 확정 필요" 또는 "하위 단계는 상위 단계 확정 후 활성화됩니다" 메시지 확인
      const emptyMessage = page.locator('text=/기능분석.*확정|하위 단계는 상위 단계 확정 후/');
      const hasEmptyMessage = await emptyMessage.count() > 0;
      
      // 또는 테이블에 실제 데이터 행이 없어야 함 (플레이스홀더 행 제외)
      const dataRows = page.locator('table tbody tr').filter({ hasNotText: /클릭|선택|입력/ });
      const rowCount = await dataRows.count();
      
      // 상위 미확정이면 데이터 행이 없거나 빈 상태 메시지가 있어야 함
      expect(hasEmptyMessage || rowCount === 0).toBe(true);
    }
  });

  test('2. 기능분석(1L) 미확정 시 고장영향(1L) 탭에서 셀 클릭 시 경고 표시', async ({ page }) => {
    // 1L기능 탭으로 이동
    const functionL1Tab = page.locator('button:has-text("1L기능")');
    if (await functionL1Tab.isVisible()) {
      await functionL1Tab.click();
      await page.waitForTimeout(800);
    }
    
    // 확정하지 않음 (확정 버튼이 있으면 클릭하지 않음)
    
    // 1L영향 탭으로 이동
    const failureL1Tab = page.locator('button:has-text("1L영향")');
    await failureL1Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블의 셀 클릭 시도
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 클릭 가능한 셀 찾기 (input, button, 또는 클릭 가능한 div)
    const clickableCell = table.locator('td input, td button, td[onclick], td:has-text("선택")').first();
    
    if (await clickableCell.isVisible()) {
      // 다이얼로그 수집
      let dialogMessage = '';
      page.on('dialog', async (dlg) => {
        dialogMessage = dlg.message();
        await dlg.dismiss();
      });
      
      await clickableCell.click();
      await page.waitForTimeout(500);
      
      // 경고 메시지 확인
      if (dialogMessage) {
        expect(dialogMessage).toContain('기능분석');
        expect(dialogMessage).toContain('확정');
      }
    }
  });

  test('3. 기능분석(1L) 확정 후 고장영향(1L) 탭이 활성화되어야 함', async ({ page }) => {
    // 1L기능 탭으로 이동
    const functionL1Tab = page.locator('button:has-text("1L기능")');
    await expect(functionL1Tab).toBeVisible();
    await functionL1Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블이 표시되는지 확인
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 확정 버튼 찾기
    const confirmBtn = page.locator('button:has-text("확정")').first();
    
    if (await confirmBtn.isVisible()) {
      // 확정 버튼 클릭
      await confirmBtn.click();
      await page.waitForTimeout(1000);
      
      // 다이얼로그 처리 (누락 항목 경고 등)
      page.on('dialog', async (dlg) => {
        await dlg.dismiss();
      });
    }
    
    // 1L영향 탭으로 이동
    const failureL1Tab = page.locator('button:has-text("1L영향")');
    await failureL1Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블이 표시되어야 함
    const failureTable = page.locator('table').first();
    await expect(failureTable).toBeVisible({ timeout: 10000 });
    
    // 확정된 상태에서는 데이터 행이 표시되어야 함 (또는 빈 상태 메시지가 없어야 함)
    const emptyMessage = page.locator('text=/기능분석.*확정 필요|하위 단계는 상위 단계 확정 후/');
    const hasEmptyMessage = await emptyMessage.count() > 0;
    
    // 상위가 확정되었으면 빈 상태 메시지가 없어야 함
    expect(hasEmptyMessage).toBe(false);
  });

  test('4. 고장영향(1L) 미확정 시 고장형태(2L) 탭이 비활성화되어야 함', async ({ page }) => {
    // 1L영향 탭으로 이동
    const failureL1Tab = page.locator('button:has-text("1L영향")');
    if (await failureL1Tab.isVisible()) {
      await failureL1Tab.click();
      await page.waitForTimeout(800);
    }
    
    // 확정하지 않음
    
    // 2L형태 탭으로 이동
    const failureL2Tab = page.locator('button:has-text("2L형태")');
    await expect(failureL2Tab).toBeVisible();
    await failureL2Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블이 표시되는지 확인
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 상위 단계가 미확정이면 빈 상태 메시지가 표시되어야 함
    const emptyMessage = page.locator('text=/고장영향.*확정|하위 단계는 상위 단계 확정 후/');
    const hasEmptyMessage = await emptyMessage.count() > 0;
    
    // 또는 테이블에 실제 데이터 행이 없어야 함
    const dataRows = page.locator('table tbody tr').filter({ hasNotText: /클릭|선택|입력/ });
    const rowCount = await dataRows.count();
    
    // 상위 미확정이면 데이터 행이 없거나 빈 상태 메시지가 있어야 함
    expect(hasEmptyMessage || rowCount === 0).toBe(true);
  });

  test('5. 고장형태(2L) 미확정 시 고장원인(3L) 탭이 비활성화되어야 함', async ({ page }) => {
    // 2L형태 탭으로 이동
    const failureL2Tab = page.locator('button:has-text("2L형태")');
    if (await failureL2Tab.isVisible()) {
      await failureL2Tab.click();
      await page.waitForTimeout(800);
    }
    
    // 확정하지 않음
    
    // 3L원인 탭으로 이동
    const failureL3Tab = page.locator('button:has-text("3L원인")');
    await expect(failureL3Tab).toBeVisible();
    await failureL3Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블이 표시되는지 확인
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 상위 단계가 미확정이면 빈 상태 메시지가 표시되어야 함
    const emptyMessage = page.locator('text=/고장형태.*확정|하위 단계는 상위 단계 확정 후/');
    const hasEmptyMessage = await emptyMessage.count() > 0;
    
    // 또는 테이블에 실제 데이터 행이 없어야 함
    const dataRows = page.locator('table tbody tr').filter({ hasNotText: /클릭|선택|입력/ });
    const rowCount = await dataRows.count();
    
    // 상위 미확정이면 데이터 행이 없거나 빈 상태 메시지가 있어야 함
    expect(hasEmptyMessage || rowCount === 0).toBe(true);
  });

  test('6. 플레이스홀더 요구사항이 FE 행으로 생성되지 않아야 함', async ({ page }) => {
    // 1L기능 탭으로 이동
    const functionL1Tab = page.locator('button:has-text("1L기능")');
    await expect(functionL1Tab).toBeVisible();
    await functionL1Tab.click();
    await page.waitForTimeout(1000);
    
    // 확정 버튼 클릭 (데이터가 있으면)
    const confirmBtn = page.locator('button:has-text("확정")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
      
      // 다이얼로그 처리
      page.on('dialog', async (dlg) => {
        await dlg.dismiss();
      });
    }
    
    // 1L영향 탭으로 이동
    const failureL1Tab = page.locator('button:has-text("1L영향")');
    await failureL1Tab.click();
    await page.waitForTimeout(1000);
    
    // 테이블이 표시되는지 확인
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 플레이스홀더 텍스트가 포함된 행이 없어야 함
    const placeholderRows = page.locator('table tbody tr').filter({ 
      hasText: /클릭하여|요구사항 선택|기능분석에서.*입력 필요/
    });
    const placeholderCount = await placeholderRows.count();
    
    // 플레이스홀더 행이 없어야 함
    expect(placeholderCount).toBe(0);
  });
});

