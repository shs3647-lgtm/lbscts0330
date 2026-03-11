/**
 * TDD: 발생도 컬럼 문제 디버깅
 */
import { test, expect } from '@playwright/test';

test('발생도 컬럼 rowSpan 디버깅', async ({ page }) => {
  // 콘솔 로그 캡처
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('processFailureLinks') || text.includes('AllTabEmpty') || text.includes('발생도')) {
      logs.push(text);
      console.log(text);
    }
  });

  // localStorage 완전 초기화
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // 워크시트 페이지 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // ALL 버튼 클릭
  await page.click('button:has-text("ALL")');
  await page.waitForTimeout(2000);

  // 스크린샷 촬영
  await page.screenshot({ path: 'tests/screenshots/occurrence-debug.png', fullPage: true });

  // 로그 출력
  console.log('\n=== processFailureLinks 로그 ===');
  logs.filter(l => l.includes('processFailureLinks')).forEach(l => console.log(l));
  
  console.log('\n=== AllTabEmpty 로그 ===');
  logs.filter(l => l.includes('AllTabEmpty')).forEach(l => console.log(l));

  // 테이블 구조 확인
  const headerCells = await page.locator('table thead tr:last-child th').allTextContents();
  console.log('\n=== 헤더 구조 ===');
  console.log(headerCells.join(' | '));

  // 처음 5개 행의 td 텍스트 확인
  console.log('\n=== 바디 행 분석 ===');
  const rows = await page.locator('table tbody tr').all();
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const cells = await rows[i].locator('td').allTextContents();
    console.log(`행 ${i}: [${cells.join('] [')}]`);
  }

  // 발생도 컬럼 헤더 인덱스 찾기
  const occIdx = headerCells.findIndex(h => h.includes('발생도'));
  console.log(`\n발생도 헤더 인덱스: ${occIdx}`);

  // 발생도 컬럼에 고장원인 텍스트가 있는지 확인
  const invalidTexts = ['교육 미흡', '선입선출', 'MSA', '작업자 실수'];
  let hasError = false;
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = await rows[i].locator('td').allTextContents();
    cells.forEach((cellText, idx) => {
      invalidTexts.forEach(pattern => {
        if (cellText.includes(pattern)) {
          console.log(`⚠️ 행 ${i}, 셀 ${idx}: "${cellText}" - 고장원인 텍스트 발견`);
          hasError = true;
        }
      });
    });
  }

  if (!hasError) {
    console.log('✅ 발생도 컬럼에 고장원인 텍스트 없음');
  }
});










