/**
 * @file function-l1-new-row-merge.spec.ts
 * @description 새행추가 후 병합 추가가 되는지 검증
 * 
 * 시나리오: 
 * 1. 새 행 추가 (위/아래)
 * 2. 새로 추가된 빈 행에서 우클릭
 * 3. "위로 병합 추가" 또는 "아래로 병합 추가" 클릭
 * 4. 행 수가 증가하는지 확인
 */
import { test, expect } from '@playwright/test';

test.describe('새행추가 후 병합 추가 테스트', () => {
  let alertMessages: string[] = [];

  test.beforeEach(async ({ page }) => {
    alertMessages = [];
    page.on('dialog', async dialog => {
      alertMessages.push(dialog.message());
      console.log('ALERT:', dialog.message());
      await dialog.accept();
    });

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1L기능 탭
    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    // 수동 모드
    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('1) 새 행 추가 후 → 그 행에서 병합 추가', async ({ page }) => {
    const beforeRows = await page.locator('table tbody tr').count();
    console.log(`초기 행 수: ${beforeRows}`);

    // Step 1: 기존 기능 셀에 우클릭 → 새 행 추가
    const funcCell = page.locator('table tbody td').filter({ hasText: /유지한다|확보한다/ }).first();
    await funcCell.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    // 스크린샷: 컨텍스트 메뉴
    await page.screenshot({ path: 'tests/screenshots/new-row-merge-01-context.png' });

    // "위로 새 행 추가" 클릭
    const insertAboveBtn = page.locator('button:has-text("위로 새 행 추가")');
    if (await insertAboveBtn.isVisible()) {
      await insertAboveBtn.click();
      await page.waitForTimeout(1500);
    }

    const afterInsertRows = await page.locator('table tbody tr').count();
    console.log(`새 행 추가 후 행 수: ${afterInsertRows}`);
    expect(afterInsertRows).toBeGreaterThan(beforeRows);

    // 스크린샷: 새 행 추가 후
    await page.screenshot({ path: 'tests/screenshots/new-row-merge-02-after-insert.png', fullPage: true });

    // Step 2: 새로 추가된 빈 행에서 우클릭
    // 새 행은 맨 위에 추가되므로, "기능" 또는 "기능 선택" placeholder가 있는 첫번째 빈 셀
    const newEmptyFuncCell = page.locator('table tbody td').filter({ hasText: /^기능$|기능 선택/ }).first();
    const cellText = await newEmptyFuncCell.textContent();
    console.log(`새 행의 기능 셀 텍스트: "${cellText}"`);

    await newEmptyFuncCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    // 스크린샷: 새 행에서 컨텍스트 메뉴
    await page.screenshot({ path: 'tests/screenshots/new-row-merge-03-new-context.png' });

    // "위로 병합 추가" 확인
    const mergeAboveBtn = page.locator('button:has-text("위로 병합 추가")');
    const mergeVisible = await mergeAboveBtn.isVisible();
    console.log(`"위로 병합 추가" 버튼 보임: ${mergeVisible}`);

    if (mergeVisible) {
      await mergeAboveBtn.click();
      await page.waitForTimeout(2000);

      // 스크린샷: 병합 추가 후
      await page.screenshot({ path: 'tests/screenshots/new-row-merge-04-after-merge.png', fullPage: true });

      const afterMergeRows = await page.locator('table tbody tr').count();
      console.log(`병합 추가 후 행 수: ${afterMergeRows}`);
      console.log(`행 변화: ${afterInsertRows} → ${afterMergeRows} (+${afterMergeRows - afterInsertRows})`);
      
      // alert 확인
      const hasSuccessAlert = alertMessages.some(m => m.includes('완료'));
      const hasFailAlert = alertMessages.some(m => m.includes('실패'));
      console.log(`성공 alert: ${hasSuccessAlert}, 실패 alert: ${hasFailAlert}`);
      console.log(`전체 alert:\n${alertMessages.join('\n---\n')}`);

      expect(afterMergeRows).toBeGreaterThan(afterInsertRows);
    } else {
      console.log('❌ "위로 병합 추가" 버튼이 보이지 않음!');
      // 컨텍스트 메뉴 내용 확인
      const menuItems = await page.locator('.fixed button, [style*="fixed"] button').allTextContents();
      console.log('메뉴 항목:', menuItems);
      expect(mergeVisible).toBe(true);
    }
  });

  test('2) 새 행의 구분 셀에서 병합 추가', async ({ page }) => {
    const beforeRows = await page.locator('table tbody tr').count();

    // Step 1: 기존 행 우클릭 → 새 행 추가
    const typeCell = page.locator('table tbody td').filter({ hasText: /YP|SP|USER/ }).first();
    await typeCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    const insertAboveBtn = page.locator('button:has-text("위로 새 행 추가")');
    if (await insertAboveBtn.isVisible()) {
      await insertAboveBtn.click();
      await page.waitForTimeout(1500);
    }

    const afterInsertRows = await page.locator('table tbody tr').count();
    console.log(`새 행 추가 후: ${beforeRows} → ${afterInsertRows}`);

    // Step 2: 새로 추가된 빈 구분 셀에서 우클릭
    // 새 행은 "(빈 타입)" 또는 "구분" placeholder
    const emptyTypeCell = page.locator('table tbody td').filter({ hasText: /빈 타입|구분 선택|^구분$/ }).first();
    const cellText = await emptyTypeCell.textContent();
    console.log(`새 행의 구분 셀: "${cellText}"`);

    await emptyTypeCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    // "위로 병합 추가" 클릭
    const mergeAboveBtn = page.locator('button:has-text("위로 병합 추가")');
    const mergeVisible = await mergeAboveBtn.isVisible();
    console.log(`구분 셀 - "위로 병합 추가" 보임: ${mergeVisible}`);

    if (mergeVisible) {
      await mergeAboveBtn.click();
      await page.waitForTimeout(2000);

      const afterMergeRows = await page.locator('table tbody tr').count();
      console.log(`구분 병합 추가 후: ${afterInsertRows} → ${afterMergeRows}`);

      // alert 확인
      console.log(`alert 메시지: ${alertMessages.join(' | ')}`);
    }

    await page.screenshot({ path: 'tests/screenshots/new-row-merge-05-type-merge.png', fullPage: true });
  });

  test('3) 새 행의 요구사항 셀에서 병합 추가', async ({ page }) => {
    const beforeRows = await page.locator('table tbody tr').count();

    // Step 1: 기존 행 우클릭 → 새 행 추가
    const funcCell = page.locator('table tbody td').filter({ hasText: /유지한다/ }).first();
    await funcCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    const insertAboveBtn = page.locator('button:has-text("위로 새 행 추가")');
    if (await insertAboveBtn.isVisible()) {
      await insertAboveBtn.click();
      await page.waitForTimeout(1500);
    }

    const afterInsertRows = await page.locator('table tbody tr').count();

    // Step 2: 새 행의 요구사항 셀에서 우클릭
    const emptyReqCell = page.locator('table tbody td').filter({ hasText: /요구사항 선택/ }).first();
    await emptyReqCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/new-row-merge-06-req-context.png' });

    // "아래로 병합 추가" 클릭
    const mergeBelowBtn = page.locator('button:has-text("아래로 병합 추가")');
    const mergeVisible = await mergeBelowBtn.isVisible();
    console.log(`요구사항 셀 - "아래로 병합 추가" 보임: ${mergeVisible}`);

    if (mergeVisible) {
      await mergeBelowBtn.click();
      await page.waitForTimeout(2000);

      const afterMergeRows = await page.locator('table tbody tr').count();
      console.log(`요구사항 병합 추가 후: ${afterInsertRows} → ${afterMergeRows}`);
      console.log(`alert: ${alertMessages.join(' | ')}`);
    }

    await page.screenshot({ path: 'tests/screenshots/new-row-merge-07-req-after.png', fullPage: true });
  });
});
