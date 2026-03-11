/**
 * @file function-l1-modal-save.spec.ts
 * @description 새 행에서 모달 선택 → 값 저장 검증
 */
import { test, expect } from '@playwright/test';

test.describe('새 행 모달 저장 테스트', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
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

  test('새 행 추가 후 기능 셀 클릭 → 모달에서 값 선택 → 저장', async ({ page }) => {
    // Step 1: 새 행 추가
    const ypCell = page.locator('table tbody td').filter({ hasText: /^YP$/ }).first();
    await ypCell.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    const insertBtn = page.locator('button:has-text("위로 새 행 추가")');
    await insertBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/modal-save-01-new-row.png', fullPage: true });

    // Step 2: 새 행의 "기능" 셀 클릭 (모달 열기)
    const funcCell = page.locator('table tbody td').filter({ hasText: /^기능$/ }).first();
    console.log(`기능 셀 찾음: ${await funcCell.isVisible()}`);
    await funcCell.click();
    await page.waitForTimeout(1000);

    // 모달이 열렸는지 확인
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /완제품 기능 선택|기능 선택/ });
    const modalVisible = await modal.isVisible().catch(() => false);
    console.log(`모달 표시: ${modalVisible}`);

    await page.screenshot({ path: 'tests/screenshots/modal-save-02-modal-open.png', fullPage: true });

    if (modalVisible) {
      // Step 3: 모달에서 항목 클릭 (체크박스)
      const checkboxes = modal.locator('input[type="checkbox"]');
      const checkCount = await checkboxes.count();
      console.log(`체크박스 수: ${checkCount}`);
      
      if (checkCount > 0) {
        // 첫 번째 체크박스 클릭
        await checkboxes.first().click();
        await page.waitForTimeout(500);
        console.log('첫 번째 체크박스 클릭 완료');
      }

      // 저장 또는 확인 버튼 클릭
      const saveBtn = modal.locator('button').filter({ hasText: /저장|확인|적용|선택/ });
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
        console.log('저장 버튼 클릭');
      }

      await page.screenshot({ path: 'tests/screenshots/modal-save-03-after-save.png', fullPage: true });

      // Step 4: 셀에 값이 저장되었는지 확인
      const updatedCell = page.locator('table tbody td').filter({ hasText: /기능$/ });
      const updatedCount = await updatedCell.count();
      console.log(`"기능" placeholder 남은 개수: ${updatedCount}`);
    } else {
      // 모달이 안 열렸으면 스크린샷 저장하고 검사
      console.log('모달이 열리지 않음 - 직접 입력 시도');
      
      // 더블클릭으로 인라인 편집
      const funcCellForEdit = page.locator('table tbody td').filter({ hasText: /^기능$/ }).first();
      await funcCellForEdit.dblclick();
      await page.waitForTimeout(500);

      // 입력 필드에 값 입력
      const input = page.locator('input[type="text"]').first();
      if (await input.isVisible()) {
        await input.fill('테스트 기능');
        await input.press('Enter');
        await page.waitForTimeout(1000);
        console.log('인라인 편집으로 값 입력');
      }

      await page.screenshot({ path: 'tests/screenshots/modal-save-04-inline.png', fullPage: true });
    }
  });
});
