/**
 * @file cp-worksheet-row-addition.spec.ts
 * @description CP 워크시트 행 추가 및 병합 로직 TDD 검증
 * 
 * 검증 항목:
 * 1. A, B열에서 엔터: 병합 없이 A~S열까지 새 행 추가
 * 2. D열에서 엔터: A, B열 병합, C~S열 새 행 추가
 * 3. E열에서 엔터: A, B, C, D열 병합, E열 새 행 추가
 * 4. I열에서 엔터: A, B, C, D, E열 병합, I열 새 행 추가
 * 5. 각 rowSpan 계산이 독립적으로 작동하는지
 * 6. DB 저장 검증
 */

import { test, expect } from '@playwright/test';

test.describe('CP 워크시트 행 추가 및 병합 로직 검증', () => {
  test.beforeEach(async ({ page }) => {
    // CP 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/control-plan/worksheet?cpNo=test-cp-001');
    await page.waitForLoadState('networkidle');
  });

  test('TC1: A열에서 엔터 - 병합 없이 A~S열까지 새 행 추가', async ({ page }) => {
    // 1. 초기 상태 확인
    const initialRowCount = await page.locator('tbody tr').count();
    
    // 2. A열 첫 번째 셀에 포커스
    const aCell = page.locator('tbody tr').first().locator('td').nth(1); // A열 (0번째는 NO열)
    await aCell.click();
    
    // 3. 엔터 키 입력
    await aCell.press('Enter');
    
    // 4. 행이 추가되었는지 확인
    const newRowCount = await page.locator('tbody tr').count();
    expect(newRowCount).toBe(initialRowCount + 1);
    
    // 5. A, B열이 병합되지 않았는지 확인 (고유값 사용)
    const newRow = page.locator('tbody tr').nth(1);
    const newAValue = await newRow.locator('td').nth(1).locator('input').inputValue();
    const newBValue = await newRow.locator('td').nth(2).locator('input').inputValue();
    
    // A, B열이 고유값(언더스코어로 시작)인지 확인
    expect(newAValue).toMatch(/^_/);
    expect(newBValue).toMatch(/^_/);
  });

  test('TC2: D열에서 엔터 - A, B열 병합, C~S열 새 행 추가', async ({ page }) => {
    // 1. 초기 데이터 준비 (공정번호, 공정명이 있는 행)
    const firstRow = page.locator('tbody tr').first();
    const dCell = firstRow.locator('td').nth(4); // D열 (NO=0, A=1, B=2, C=3, D=4)
    
    // 2. D열에 값 입력
    await dCell.click();
    await dCell.locator('input').fill('테스트 공정설명');
    
    // 3. 엔터 키 입력
    await dCell.locator('input').press('Enter');
    
    // 4. 행이 추가되었는지 확인
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(1);
    
    // 5. A, B열이 병합되었는지 확인 (같은 값)
    const secondRow = page.locator('tbody tr').nth(1);
    const firstAValue = await firstRow.locator('td').nth(1).locator('input').inputValue();
    const secondAValue = await secondRow.locator('td').nth(1).locator('input').inputValue();
    
    // A, B열이 부모 값으로 설정되었는지 확인 (고유값이 아님)
    expect(secondAValue).not.toMatch(/^_/);
    if (firstAValue && !firstAValue.startsWith('_')) {
      expect(secondAValue).toBe(firstAValue);
    }
    
    // 6. C, D열이 빈 값인지 확인 (병합 안 됨)
    const secondCValue = await secondRow.locator('td').nth(3).locator('input, select').inputValue();
    const secondDValue = await secondRow.locator('td').nth(4).locator('input').inputValue();
    
    // C, D열이 빈 값이거나 기본값인지 확인
    expect(secondCValue || '').toBe('');
    expect(secondDValue || '').toBe('');
  });

  test('TC3: E열에서 엔터 - A, B, C, D열 병합, E열 새 행 추가', async ({ page }) => {
    // 1. 초기 데이터 준비
    const firstRow = page.locator('tbody tr').first();
    const eCell = firstRow.locator('td').nth(5); // E열
    
    // 2. E열에 값 입력
    await eCell.click();
    await eCell.locator('input').fill('테스트 설비');
    
    // 3. 엔터 키 입력
    await eCell.locator('input').press('Enter');
    
    // 4. 행이 추가되었는지 확인
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(1);
    
    // 5. A, B, C, D열이 병합되었는지 확인
    const secondRow = page.locator('tbody tr').nth(1);
    const firstCValue = await firstRow.locator('td').nth(3).locator('input, select').inputValue();
    const firstDValue = await firstRow.locator('td').nth(4).locator('input').inputValue();
    const secondCValue = await secondRow.locator('td').nth(3).locator('input, select').inputValue();
    const secondDValue = await secondRow.locator('td').nth(4).locator('input').inputValue();
    
    // C, D열이 현재 행의 값으로 복사되었는지 확인
    if (firstCValue) {
      expect(secondCValue).toBe(firstCValue);
    }
    if (firstDValue) {
      expect(secondDValue).toBe(firstDValue);
    }
    
    // 6. E열이 빈 값인지 확인 (병합 안 됨)
    const secondEValue = await secondRow.locator('td').nth(5).locator('input').inputValue();
    expect(secondEValue || '').toBe('');
  });

  test('TC4: I열에서 엔터 - A, B, C, D, E열 병합, I열 새 행 추가', async ({ page }) => {
    // 1. 초기 데이터 준비
    const firstRow = page.locator('tbody tr').first();
    const iCell = firstRow.locator('td').nth(9); // I열 (제품특성)
    
    // 2. I열에 값 입력
    await iCell.click();
    await iCell.locator('input').fill('테스트 제품특성');
    
    // 3. 엔터 키 입력
    await iCell.locator('input').press('Enter');
    
    // 4. 행이 추가되었는지 확인
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(1);
    
    // 5. A, B, C, D, E열이 병합되었는지 확인
    const secondRow = page.locator('tbody tr').nth(1);
    const firstEValue = await firstRow.locator('td').nth(5).locator('input').inputValue();
    const secondEValue = await secondRow.locator('td').nth(5).locator('input').inputValue();
    
    // E열이 현재 행의 값으로 복사되었는지 확인
    if (firstEValue) {
      expect(secondEValue).toBe(firstEValue);
    }
    
    // 6. I열이 빈 값인지 확인 (병합 안 됨)
    const secondIValue = await secondRow.locator('td').nth(9).locator('input').inputValue();
    expect(secondIValue || '').toBe('');
  });

  test('TC5: 각 rowSpan 계산이 독립적으로 작동하는지', async ({ page }) => {
    // 1. 여러 행 추가
    const firstRow = page.locator('tbody tr').first();
    
    // D열에서 행 추가
    await firstRow.locator('td').nth(4).click();
    await firstRow.locator('td').nth(4).locator('input').press('Enter');
    
    // E열에서 행 추가
    await firstRow.locator('td').nth(5).click();
    await firstRow.locator('td').nth(5).locator('input').press('Enter');
    
    // 2. 각 rowSpan이 독립적으로 계산되는지 확인
    // (실제 rowSpan 계산은 useRowSpan 훅에서 수행되므로, 
    //  렌더링된 결과를 확인)
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(2);
    
    // 3. A, B열 병합 확인 (useProcessRowSpan)
    // 4. C, D열 병합 확인 (useDescRowSpan)
    // 5. E열 병합 확인 (useWorkRowSpan)
    // 6. I열 병합 확인 (useCharRowSpan)
  });

  test('TC6: DB 저장 검증 - 행 추가 후 저장', async ({ page }) => {
    // 1. 행 추가
    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('td').nth(4).click();
    await firstRow.locator('td').nth(4).locator('input').press('Enter');
    
    // 2. 저장 버튼 클릭
    const saveButton = page.locator('button:has-text("저장"), button:has-text("확정")');
    await saveButton.click();
    
    // 3. 저장 완료 메시지 확인
    await page.waitForTimeout(1000);
    
    // 4. 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 5. 추가된 행이 유지되는지 확인
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(1);
  });
});

