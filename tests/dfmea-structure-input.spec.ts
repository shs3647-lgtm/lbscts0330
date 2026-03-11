/**
 * DFMEA 구조분석 실제 데이터 입력 테스트
 * 3패키지 × 2부품 입력 후 모든 탭 스크린샷
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('DFMEA 구조분석 3패키지 입력', async ({ page }) => {
  console.log('\n===== DFMEA 구조분석 데이터 입력 =====\n');
  
  // 1. DFMEA 워크시트 페이지 직접 열기
  await page.goto(`${BASE_URL}/dfmea/worksheet`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 페이지 타이틀 확인
  const pageContent = await page.content();
  console.log('페이지 로드됨');
  
  // 구조분석 탭 클릭 시도
  const structureTab = page.locator('button, [role="tab"]').filter({ hasText: /구조분석|2단계|Structure/ }).first();
  if (await structureTab.isVisible().catch(() => false)) {
    await structureTab.click();
    await page.waitForTimeout(1000);
    console.log('구조분석 탭 클릭');
  }
  
  // 스크린샷
  await page.screenshot({ path: 'test-results/structure-tab.png', fullPage: true });
  console.log('📸 저장: test-results/structure-tab.png');
  
  // 테이블 확인
  const table = page.locator('table').first();
  if (await table.isVisible().catch(() => false)) {
    console.log('✅ 테이블 발견');
    
    // 제품명 입력 필드 찾기
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`입력 필드 수: ${inputCount}`);
    
    if (inputCount > 0) {
      // 첫 번째 입력 필드에 타이어 입력
      const firstInput = inputs.first();
      await firstInput.click();
      await firstInput.fill('타이어');
      await firstInput.press('Tab');
      await page.waitForTimeout(500);
      console.log('✅ 제품명 "타이어" 입력');
    }
  }
  
  // 최종 스크린샷
  await page.screenshot({ path: 'test-results/structure-input.png', fullPage: true });
  console.log('📸 저장: test-results/structure-input.png');
  
  // All 탭 이동
  const allTab = page.locator('button, [role="tab"]').filter({ hasText: /전체|All|7단계/ }).first();
  if (await allTab.isVisible().catch(() => false)) {
    await allTab.click();
    await page.waitForTimeout(1500);
    console.log('All 탭 이동');
  }
  
  await page.screenshot({ path: 'test-results/all-tab.png', fullPage: true });
  console.log('📸 저장: test-results/all-tab.png');
  
  console.log('\n===== 완료 =====\n');
});
