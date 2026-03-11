import { test } from '@playwright/test';

test('3L원인 누락건 스크린샷', async ({ page }) => {
  await page.goto('http://localhost:3000/pfmea/worksheet');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // 3L원인 탭 클릭
  const tabButton = page.locator('button, a, div, span').filter({ hasText: '3L원인' }).first();
  if (await tabButton.isVisible()) {
    await tabButton.click();
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: 'tests/screenshots/l3-missing-view.png', fullPage: true });
  console.log('✅ 3L원인 스크린샷 저장 완료');
});




