/**
 * DFMEA 최종 시딩 - dfm26-m001 타이어개발
 */
import { test } from '@playwright/test';

test('dfm26-m001 타이어개발 저장', async ({ page }) => {
  // 1. 시드 페이지 열고 데이터 저장
  await page.goto('http://localhost:3000/seed-dfmea.html');
  await page.waitForTimeout(1000);
  
  // 데이터 저장 버튼 클릭
  await page.click('button:has-text("데이터 저장")');
  await page.waitForTimeout(500);
  console.log('✅ 데이터 저장 완료');
  
  // 2. 워크시트 열기
  await page.click('button:has-text("워크시트 열기")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // 3. 구조분석 스크린샷
  await page.screenshot({ path: 'test-results/dfm26-structure.png', fullPage: true });
  console.log('📸 구조분석');
  
  // 4. All 탭
  const allTab = page.locator('button, [role="tab"]').filter({ hasText: /전체|All/ }).first();
  if (await allTab.isVisible().catch(() => false)) {
    await allTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/dfm26-all.png', fullPage: true });
    console.log('📸 All 탭');
  }
  
  // 5. 고장연결 탭
  const linkTab = page.locator('button, [role="tab"]').filter({ hasText: /고장연결|Link/ }).first();
  if (await linkTab.isVisible().catch(() => false)) {
    await linkTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/dfm26-link.png', fullPage: true });
    console.log('📸 고장연결 탭');
  }
  
  console.log('\n✅ dfm26-m001 (타이어개발) 저장 완료!');
});
