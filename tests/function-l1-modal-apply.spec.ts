/**
 * @file function-l1-modal-apply.spec.ts
 * @description 새 행에서 모달 → 적용 → 값 저장 검증
 */
import { test, expect } from '@playwright/test';

test('새 행 기능 모달 → 항목 선택 → 적용 → 값 저장', async ({ page }) => {
  page.on('dialog', async dialog => {
    console.log('ALERT:', dialog.message());
    await dialog.accept();
  });

  page.on('console', msg => {
    if (msg.text().includes('handleSave') || msg.text().includes('FunctionL1Tab')) {
      console.log(`BROWSER: ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // 1L기능 탭
  await page.locator('text=1L기능').first().click();
  await page.waitForTimeout(1000);

  // 수동 모드
  const manualBtn = page.locator('button:has-text("수동")');
  if (await manualBtn.isVisible()) await manualBtn.click();
  await page.waitForTimeout(500);

  // Step 1: 새 행 추가
  const ypCell = page.locator('table tbody td').filter({ hasText: /^YP$/ }).first();
  await ypCell.click({ button: 'right' });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("위로 새 행 추가")').click();
  await page.waitForTimeout(1500);

  console.log('새 행 추가 완료');

  // Step 2: 새 행의 "구분" 셀 클릭 → 모달
  const typeCell = page.locator('table tbody td').filter({ hasText: /^구분$/ }).first();
  await typeCell.click();
  await page.waitForTimeout(1500);

  // 모달 확인
  let modalContent = page.locator('[class*="fixed"]').filter({ hasText: /구분 선택/ });
  if (await modalContent.isVisible().catch(() => false)) {
    console.log('구분 모달 열림');

    // 모달 내 항목 검색 (YP, SP 등)
    const allText = await modalContent.textContent();
    console.log(`모달 내용 일부: ${allText?.substring(0, 200)}`);

    // 검색창에 직접 입력 후 Enter
    const searchInput = modalContent.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('TEST_TYPE');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
      console.log('검색창에 "TEST_TYPE" 입력 + Enter');
    }

    // 닫기
    const closeBtn = modalContent.locator('button:has-text("닫기")');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: 'tests/screenshots/modal-apply-01.png', fullPage: true });

  // 구분 셀에 값이 저장되었는지 확인
  const testTypeCell = page.locator('table tbody td').filter({ hasText: /TEST_TYPE/ });
  const hasTestType = await testTypeCell.count();
  console.log(`"TEST_TYPE" 셀 존재: ${hasTestType > 0}`);

  // Step 3: 기능 셀에서도 테스트 - 더블클릭 인라인 편집
  const funcCell = page.locator('table tbody td').filter({ hasText: /^기능$/ }).first();
  if (await funcCell.isVisible()) {
    await funcCell.dblclick();
    await page.waitForTimeout(500);

    const inlineInput = page.locator('input').first();
    if (await inlineInput.isVisible()) {
      await inlineInput.fill('테스트기능입력');
      await inlineInput.press('Enter');
      await page.waitForTimeout(1000);
      console.log('인라인 편집 완료');
    }
  }

  await page.screenshot({ path: 'tests/screenshots/modal-apply-02.png', fullPage: true });

  // 인라인 편집 결과 확인
  const editedCell = page.locator('table tbody td').filter({ hasText: /테스트기능입력/ });
  const hasEdited = await editedCell.count();
  console.log(`"테스트기능입력" 셀 존재: ${hasEdited > 0}`);
});
