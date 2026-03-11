/**
 * CP 연동 드롭다운 디버그 테스트
 */
import { test, expect } from '@playwright/test';

test('CP 연동 드롭다운 디버그', async ({ page }) => {
  // 정확한 URL로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 페이지 스크린샷
  await page.screenshot({ path: 'test-results/debug-01-page-load.png', fullPage: true });
  
  // CP 연동 버튼 찾기 - 여러 방법 시도
  console.log('=== CP 연동 버튼 검색 ===');
  
  // 방법 1: 텍스트로 찾기
  const byText = page.locator('button:has-text("CP 연동")');
  const byTextCount = await byText.count();
  console.log('텍스트로 찾기:', byTextCount);
  
  // 방법 2: data-testid로 찾기
  const byTestId = page.locator('[data-testid="cp-sync-button"]');
  const byTestIdCount = await byTestId.count();
  console.log('data-testid로 찾기:', byTestIdCount);
  
  // 방법 3: 클래스와 텍스트 조합
  const byClass = page.locator('button.bg-teal-600\\/50');
  const byClassCount = await byClass.count();
  console.log('클래스로 찾기:', byClassCount);
  
  // 모든 버튼 텍스트 출력
  const allButtons = page.locator('button');
  const buttonCount = await allButtons.count();
  console.log('전체 버튼 개수:', buttonCount);
  
  for (let i = 0; i < Math.min(buttonCount, 20); i++) {
    const btn = allButtons.nth(i);
    const text = await btn.textContent();
    const isVisible = await btn.isVisible();
    if (text && text.includes('CP') || text && text.includes('연동')) {
      console.log(`버튼 ${i}: "${text?.trim()}" visible=${isVisible}`);
      const box = await btn.boundingBox();
      console.log(`  위치:`, box);
    }
  }
  
  // CP 연동 버튼 클릭 시도
  if (byTestIdCount > 0) {
    const cpBtn = byTestId.first();
    const isVisible = await cpBtn.isVisible();
    console.log('CP 연동 버튼 visible:', isVisible);
    
    if (isVisible) {
      // 클릭 전 상태
      await page.screenshot({ path: 'test-results/debug-02-before-click.png', fullPage: true });
      
      // 클릭
      await cpBtn.click({ force: true });
      console.log('CP 연동 버튼 클릭됨');
      
      await page.waitForTimeout(1000);
      
      // 클릭 후 상태
      await page.screenshot({ path: 'test-results/debug-03-after-click.png', fullPage: true });
      
      // 드롭다운 확인
      const dropdown = page.locator('text=CP 구조연동');
      const dropdownVisible = await dropdown.isVisible();
      console.log('드롭다운 visible:', dropdownVisible);
      
      // 드롭다운 메뉴 찾기
      const dropdownMenu = page.locator('.absolute.top-full');
      const menuCount = await dropdownMenu.count();
      console.log('드롭다운 메뉴 개수:', menuCount);
      
      for (let i = 0; i < menuCount; i++) {
        const menu = dropdownMenu.nth(i);
        const isVis = await menu.isVisible();
        const html = await menu.innerHTML();
        console.log(`메뉴 ${i}: visible=${isVis}, html=${html.substring(0, 100)}`);
      }
    }
  } else if (byTextCount > 0) {
    // 텍스트로 찾은 버튼 사용
    const cpBtn = byText.first();
    await cpBtn.click({ force: true });
    console.log('텍스트로 찾은 버튼 클릭됨');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/debug-03-after-click.png', fullPage: true });
  }
  
  // 최종 HTML 구조 확인
  const topMenuHtml = await page.locator('.flex.items-center').first().innerHTML().catch(() => 'not found');
  console.log('TopMenu HTML (일부):', topMenuHtml.substring(0, 500));
});
