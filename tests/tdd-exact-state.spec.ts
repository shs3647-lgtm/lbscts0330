/**
 * TDD: 정확한 사용자 상태 재현 (visibleSteps = [4, 5, 6])
 */
import { test, expect } from '@playwright/test';

test('visibleSteps=[4,5,6] 상태에서 발생도 컬럼 검증', async ({ page }) => {
  // localStorage 완전 초기화 후 특정 상태 설정
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // ALL 버튼 클릭 (전체 표시 상태로)
  await page.click('button:has-text("ALL")');
  await page.waitForTimeout(1000);

  // 2ST 클릭 (숨김) - 구조분석 제거
  await page.click('button:has-text("2ST")');
  await page.waitForTimeout(500);

  // 3ST 클릭 (숨김) - 기능분석 제거
  await page.click('button:has-text("3ST")');
  await page.waitForTimeout(500);

  // 이제 visibleSteps = [4, 5, 6]

  // 헤더 확인
  const headers = await page.locator('table thead tr:last-child th').allTextContents();
  console.log('\n=== [4,5,6] 상태 헤더 ===');
  headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

  // 고장원인, 발생도 인덱스 찾기
  const fcIdx = headers.findIndex(h => h.includes('고장원인'));
  const occIdx = headers.findIndex(h => h.includes('발생도') && !h.includes('재평가'));
  console.log(`\n고장원인 인덱스: ${fcIdx}, 발생도 인덱스: ${occIdx}`);

  // 바디 행 분석
  console.log('\n=== 바디 행 분석 ===');
  const rows = await page.locator('table tbody tr').all();
  
  const invalidTexts = ['교육 미흡', '선입선출', 'MSA', '작업자 실수'];
  let errorCount = 0;
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = await rows[i].locator('td').allTextContents();
    console.log(`행 ${i} (td: ${cells.length})`);
    
    // 고장원인 위치
    if (fcIdx >= 0 && fcIdx < cells.length) {
      console.log(`  [${fcIdx}] 고장원인: "${cells[fcIdx]}"`);
    }
    
    // 발생도 위치
    if (occIdx >= 0 && occIdx < cells.length) {
      const occValue = cells[occIdx];
      console.log(`  [${occIdx}] 발생도: "${occValue}"`);
      
      // 고장원인 텍스트가 발생도에 있으면 오류
      invalidTexts.forEach(pattern => {
        if (occValue.includes(pattern)) {
          console.log(`  ❌ 발생도에 고장원인 발견: "${occValue}"`);
          errorCount++;
        }
      });
    }
  }

  // 스크린샷
  await page.screenshot({ path: 'tests/screenshots/exact-state-456.png', fullPage: true });
  
  console.log(`\n오류 개수: ${errorCount}`);
  
  // 검증
  expect(errorCount).toBe(0);
});










