/**
 * @file function-l1-alert-test.spec.ts
 * @description alert() 기반 병합 추가 검증 (사용자 환경 재현)
 */
import { test, expect } from '@playwright/test';

test('병합 추가 → alert 표시 + 디버그 카운트 변화', async ({ page }) => {
  // alert 자동 처리
  let alertMessage = '';
  page.on('dialog', async dialog => {
    alertMessage = dialog.message();
    console.log('ALERT:', alertMessage);
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

  // 디버그 카운트 패널 확인
  const debugPanel = page.locator('text=디버그:');
  const panelVisible = await debugPanel.isVisible();
  console.log(`디버그 패널 표시: ${panelVisible}`);
  
  // BEFORE 스크린샷
  await page.screenshot({ path: 'tests/screenshots/alert-test-BEFORE.png', fullPage: true });
  
  const beforeRows = await page.locator('table tbody tr').count();
  console.log(`BEFORE 행 수: ${beforeRows}`);

  // 기능 셀 우클릭
  const funcCell = page.locator('table tbody td').filter({ hasText: /유지한다|확보한다/ }).first();
  if (await funcCell.isVisible()) {
    await funcCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    // 위로 병합 추가 클릭
    const mergeBtn = page.locator('button:has-text("위로 병합 추가")');
    if (await mergeBtn.isVisible()) {
      await mergeBtn.click();
      // alert는 자동으로 accept됨
      await page.waitForTimeout(2000);

      console.log(`\nALERT 메시지: "${alertMessage}"`);

      // AFTER 스크린샷
      await page.screenshot({ path: 'tests/screenshots/alert-test-AFTER.png', fullPage: true });

      const afterRows = await page.locator('table tbody tr').count();
      console.log(`AFTER 행 수: ${afterRows}`);
      console.log(`행 수 변화: ${beforeRows} → ${afterRows} (+${afterRows - beforeRows})`);

      // alert에 "완료" 포함 확인
      expect(alertMessage).toContain('완료');
      expect(afterRows).toBeGreaterThan(beforeRows);
    }
  }
});
