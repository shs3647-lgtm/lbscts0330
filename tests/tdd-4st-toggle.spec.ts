/**
 * TDD: 4ST 토글 상태에서 발생도 컬럼 검증
 */
import { test, expect } from '@playwright/test';

test('4ST 토글 시 발생도 컬럼 검증', async ({ page }) => {
  // localStorage 완전 초기화
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // ALL 버튼 클릭 먼저
  await page.click('button:has-text("ALL")');
  await page.waitForTimeout(1000);

  // 4ST 토글 (고장분석 + 리스크분석만 표시)
  await page.click('button:has-text("4ST")');
  await page.waitForTimeout(1000);

  // 헤더 확인
  const headers = await page.locator('table thead tr:last-child th').allTextContents();
  console.log('\n=== 4ST 토글 헤더 ===');
  headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

  // 발생도 인덱스 찾기
  const occIdx = headers.findIndex(h => h.includes('발생도'));
  const fcIdx = headers.findIndex(h => h.includes('고장원인'));
  console.log(`\n고장원인 인덱스: ${fcIdx}, 발생도 인덱스: ${occIdx}`);

  // 바디 행 분석
  console.log('\n=== 4ST 바디 행 분석 ===');
  const rows = await page.locator('table tbody tr').all();
  
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const cells = await rows[i].locator('td').allTextContents();
    console.log(`행 ${i} (td 개수: ${cells.length}):`);
    
    // 고장원인 위치와 발생도 위치 확인
    if (fcIdx >= 0 && fcIdx < cells.length) {
      console.log(`  [${fcIdx}] 고장원인: "${cells[fcIdx]}"`);
    }
    if (occIdx >= 0 && occIdx < cells.length) {
      console.log(`  [${occIdx}] 발생도: "${cells[occIdx]}"`);
    }
    
    // 고장원인 텍스트가 발생도 위치에 있는지 확인
    const invalidTexts = ['교육 미흡', '선입선출', 'MSA', '작업자 실수'];
    if (occIdx >= 0 && occIdx < cells.length) {
      const occValue = cells[occIdx];
      invalidTexts.forEach(pattern => {
        if (occValue.includes(pattern)) {
          console.log(`  ❌ 발생도에 고장원인 발견: "${occValue}"`);
        }
      });
    }
  }

  // 스크린샷
  await page.screenshot({ path: 'tests/screenshots/4st-toggle.png', fullPage: true });
  
  console.log('\n✅ 스크린샷 저장: tests/screenshots/4st-toggle.png');
});










