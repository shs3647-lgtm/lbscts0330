/**
 * @file function-l1-type-merge-expand.spec.ts
 * @description 구분 셀에서 병합 추가 → 기존 타입 내 기능 추가로 구분 셀 rowSpan 확장 검증
 */
import { test, expect } from '@playwright/test';

test.describe('구분 셀 병합 확장 테스트', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
      console.log('ALERT:', dialog.message());
      await dialog.accept();
    });

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('1) 구분(YP) 셀에서 "아래로 병합 추가" → 같은 구분 내 기능 추가', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/type-merge-01-before.png', fullPage: true });
    const beforeRows = await page.locator('table tbody tr').count();
    console.log(`초기 행 수: ${beforeRows}`);

    // YP 구분 셀 우클릭
    const ypCell = page.locator('table tbody td').filter({ hasText: /^YP$/ }).first();
    await ypCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    // "아래로 병합 추가" 클릭
    const mergeBelow = page.locator('button:has-text("아래로 병합 추가")');
    expect(await mergeBelow.isVisible()).toBe(true);
    await mergeBelow.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/type-merge-02-after-yp.png', fullPage: true });
    const afterRows = await page.locator('table tbody tr').count();
    console.log(`YP 병합 추가 후 행 수: ${afterRows}`);
    console.log(`행 변화: ${beforeRows} → ${afterRows} (+${afterRows - beforeRows})`);

    // 행이 1개 증가해야 함 (같은 YP 구분 안에 기능이 추가됨)
    expect(afterRows).toBe(beforeRows + 1);

    // YP 구분 셀이 여전히 하나만 존재 (rowSpan으로 확장)
    const ypCells = page.locator('table tbody td').filter({ hasText: /^YP$/ });
    const ypCount = await ypCells.count();
    console.log(`YP 셀 개수: ${ypCount} (1이어야 함 - rowSpan 확장)`);
    expect(ypCount).toBe(1);
  });

  test('2) 새 행 추가 후 구분 셀에서 병합 추가 → 구분 셀 확장', async ({ page }) => {
    const beforeRows = await page.locator('table tbody tr').count();

    // Step 1: YP 셀 우클릭 → 새 행 추가
    const ypCell = page.locator('table tbody td').filter({ hasText: /^YP$/ }).first();
    await ypCell.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    const insertAbove = page.locator('button:has-text("위로 새 행 추가")');
    await insertAbove.click();
    await page.waitForTimeout(1000);
    
    const afterInsert = await page.locator('table tbody tr').count();
    console.log(`새 행 추가 후: ${beforeRows} → ${afterInsert}`);

    // Step 2: 새 행의 구분 셀 우클릭 → 아래로 병합 추가
    const emptyTypeCell = page.locator('table tbody td').filter({ hasText: /^구분$/ }).first();
    await emptyTypeCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    const mergeBelow = page.locator('button:has-text("아래로 병합 추가")');
    await mergeBelow.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/type-merge-03-new-expanded.png', fullPage: true });
    const afterMerge = await page.locator('table tbody tr').count();
    console.log(`구분 병합 추가 후: ${afterInsert} → ${afterMerge}`);
    
    // 행이 1개 증가 (같은 구분 안에 기능 추가됨)
    expect(afterMerge).toBe(afterInsert + 1);

    // Step 3: 한번 더 → 구분 셀이 3행에 걸쳐 병합됨
    const emptyTypeCell2 = page.locator('table tbody td').filter({ hasText: /^구분$/ }).first();
    await emptyTypeCell2.click({ button: 'right' });
    await page.waitForTimeout(500);

    const mergeBelow2 = page.locator('button:has-text("아래로 병합 추가")');
    await mergeBelow2.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/type-merge-04-triple-expanded.png', fullPage: true });
    const afterTriple = await page.locator('table tbody tr').count();
    console.log(`3번째 병합 추가 후: ${afterMerge} → ${afterTriple}`);
    expect(afterTriple).toBe(afterMerge + 1);

    // 구분 셀은 여전히 1개 (rowSpan=3으로 확장)
    const emptyCells = page.locator('table tbody td').filter({ hasText: /^구분$/ });
    const emptyCount = await emptyCells.count();
    console.log(`구분 셀 개수: ${emptyCount} (1이어야 함)`);
    expect(emptyCount).toBe(1);
  });
});
