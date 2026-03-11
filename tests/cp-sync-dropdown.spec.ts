/**
 * CP 연동 드롭다운 테스트
 */
import { test, expect } from '@playwright/test';

test.describe('CP 연동 드롭다운', () => {
  test.beforeEach(async ({ page }) => {
    // FMEA 워크시트 페이지로 이동 (ID 직접 지정)
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 데이터 로드 대기
  });

  test('CP 연동 버튼 존재 확인', async ({ page }) => {
    // CP 연동 버튼 찾기
    const cpSyncButton = page.locator('button:has-text("CP 연동")');
    
    // 버튼 존재 확인
    const count = await cpSyncButton.count();
    console.log('CP 연동 버튼 개수:', count);
    
    if (count > 0) {
      const isVisible = await cpSyncButton.first().isVisible();
      console.log('CP 연동 버튼 visible:', isVisible);
      
      // 버튼 위치 확인
      const box = await cpSyncButton.first().boundingBox();
      console.log('버튼 위치:', box);
    }
    
    expect(count).toBeGreaterThan(0);
  });

  test('CP 연동 버튼 클릭 시 드롭다운 열림', async ({ page }) => {
    // CP 연동 버튼 찾기
    const cpSyncButton = page.locator('button:has-text("CP 연동")').first();
    await cpSyncButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 클릭 전 드롭다운 상태 확인
    const dropdownBefore = page.locator('text=CP 구조연동');
    const beforeVisible = await dropdownBefore.isVisible().catch(() => false);
    console.log('클릭 전 드롭다운 visible:', beforeVisible);
    
    // 버튼 클릭
    await cpSyncButton.click();
    console.log('CP 연동 버튼 클릭됨');
    
    // 드롭다운 열림 대기
    await page.waitForTimeout(500);
    
    // 드롭다운 상태 확인
    const dropdownAfter = page.locator('text=CP 구조연동');
    const afterVisible = await dropdownAfter.isVisible().catch(() => false);
    console.log('클릭 후 드롭다운 visible:', afterVisible);
    
    // 스크린샷
    await page.screenshot({ path: 'test-results/cp-sync-dropdown.png', fullPage: true });
    
    expect(afterVisible).toBe(true);
  });

  test('CP 구조연동 클릭 테스트', async ({ page }) => {
    // CP 연동 버튼 클릭
    const cpSyncButton = page.locator('button:has-text("CP 연동")').first();
    await cpSyncButton.click();
    await page.waitForTimeout(300);
    
    // CP 구조연동 버튼 클릭
    const structureSyncButton = page.locator('button:has-text("CP 구조연동")');
    const isVisible = await structureSyncButton.isVisible().catch(() => false);
    console.log('CP 구조연동 버튼 visible:', isVisible);
    
    if (isVisible) {
      // 다이얼로그 핸들러 설정
      page.on('dialog', async dialog => {
        console.log('다이얼로그 메시지:', dialog.message());
        await dialog.accept();
      });
      
      await structureSyncButton.click();
      console.log('CP 구조연동 버튼 클릭됨');
      
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ path: 'test-results/cp-structure-sync.png', fullPage: true });
  });

  test('CP 구조연동 실행 테스트 (FMEA 선택됨)', async ({ page }) => {
    // 다이얼로그 핸들러 설정
    const dialogMessages: string[] = [];
    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      console.log('다이얼로그:', dialog.message());
      await dialog.accept();
    });

    // CP 연동 버튼 클릭
    const cpSyncButton = page.locator('[data-testid="cp-sync-button"]');
    await cpSyncButton.waitFor({ state: 'visible', timeout: 10000 });
    await cpSyncButton.click();
    console.log('CP 연동 버튼 클릭됨');
    
    await page.waitForTimeout(500);
    
    // CP 구조연동 버튼 클릭
    const structureSyncButton = page.locator('button:has-text("CP 구조연동")');
    const isVisible = await structureSyncButton.isVisible();
    console.log('CP 구조연동 버튼 visible:', isVisible);
    
    if (isVisible) {
      await structureSyncButton.click();
      console.log('CP 구조연동 클릭됨');
      await page.waitForTimeout(2000);
    }
    
    console.log('수신된 다이얼로그들:', dialogMessages);
    await page.screenshot({ path: 'test-results/cp-sync-result.png', fullPage: true });
    
    // 드롭다운이 열렸는지 확인
    expect(isVisible).toBe(true);
  });
});
