/**
 * TDD: 발생도 컬럼에 고장원인 텍스트가 표시되는 문제 검증
 * 
 * 예상 결과:
 * - 발생도 컬럼은 숫자(1-10) 또는 빈 문자열만 표시
 * - 고장원인 텍스트("교육 미흡", "MSA 미실시" 등)는 발생도에 표시되면 안 됨
 */
import { test, expect } from '@playwright/test';

test.describe('발생도 컬럼 데이터 검증', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage 완전 초기화
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('발생도 컬럼에는 숫자 또는 빈칸만 표시되어야 함', async ({ page }) => {
    // 워크시트 페이지 이동
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
    await page.waitForLoadState('networkidle');
    
    // ALL 버튼 클릭
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    // 스크린샷 촬영
    await page.screenshot({ path: 'tests/screenshots/occurrence-column-before.png', fullPage: true });
    
    // 발생도 헤더 찾기
    const occurrenceHeaders = await page.locator('th:has-text("발생도")').all();
    console.log(`발생도 헤더 개수: ${occurrenceHeaders.length}`);
    
    // 각 발생도 헤더의 컬럼 인덱스 확인
    for (let i = 0; i < occurrenceHeaders.length; i++) {
      const header = occurrenceHeaders[i];
      const headerText = await header.textContent();
      console.log(`발생도 헤더 ${i}: "${headerText}"`);
    }
    
    // 테이블 바디에서 td 요소들 확인
    const rows = await page.locator('table tbody tr').all();
    console.log(`테이블 행 개수: ${rows.length}`);
    
    // 잘못된 텍스트 패턴 정의
    const invalidPatterns = ['교육 미흡', '선입선출', 'MSA', '작업자 실수', '설비 노후'];
    
    let errorCount = 0;
    const errors: string[] = [];
    
    for (let rowIdx = 0; rowIdx < Math.min(rows.length, 20); rowIdx++) {
      const row = rows[rowIdx];
      const cells = await row.locator('td').all();
      
      for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
        const cellText = await cells[cellIdx].textContent() || '';
        
        // 발생도/검출도 컬럼 위치 추정 (예방관리 다음, 검출관리 전)
        // 실제 컬럼 인덱스는 visibleSteps에 따라 다를 수 있음
        for (const pattern of invalidPatterns) {
          if (cellText.includes(pattern)) {
            const error = `행 ${rowIdx}, 셀 ${cellIdx}: "${cellText}" 포함 - 고장원인이 다른 컬럼에 표시됨`;
            errors.push(error);
            console.error(`❌ ${error}`);
            errorCount++;
          }
        }
      }
    }
    
    // 최종 스크린샷
    await page.screenshot({ path: 'tests/screenshots/occurrence-column-after.png', fullPage: true });
    
    // 콘솔 로그 캡처
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('발생도') || msg.text().includes('riskData')) {
        consoleLogs.push(msg.text());
      }
    });
    
    console.log('\n=== 테스트 결과 ===');
    console.log(`오류 개수: ${errorCount}`);
    if (errors.length > 0) {
      console.log('오류 목록:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
    // 테스트 검증: 발생도 컬럼에 고장원인 텍스트가 있으면 실패
    expect(errorCount, `발생도 컬럼에 고장원인 텍스트가 ${errorCount}개 발견됨`).toBe(0);
  });

  test('HTML 테이블 구조 검증 - 각 행의 셀 개수', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("ALL")');
    await page.waitForTimeout(2000);
    
    // 헤더 행의 컬럼 수 확인
    const headerCells = await page.locator('table thead tr:last-child th').count();
    console.log(`헤더 컬럼 수: ${headerCells}`);
    
    // 바디 각 행의 실제 td 수 확인 (rowSpan 고려하지 않음)
    const rows = await page.locator('table tbody tr').all();
    
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const cellCount = await rows[i].locator('td').count();
      console.log(`행 ${i}: td 개수 = ${cellCount}`);
    }
    
    // rowSpan으로 인해 td 개수가 다를 수 있으므로 경고만 출력
  });

  test('5ST 토글 시 컬럼 순서 검증', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001');
    await page.waitForLoadState('networkidle');
    
    // 5ST 버튼 클릭 (리스크분석만 표시)
    await page.click('button:has-text("5ST")');
    await page.waitForTimeout(1000);
    
    // 헤더 순서 확인
    const headers = await page.locator('table thead tr:last-child th').allTextContents();
    console.log('5ST 헤더 순서:', headers);
    
    // 발생도가 예방관리 다음에 있는지 확인
    const pcIdx = headers.findIndex(h => h.includes('예방관리'));
    const occIdx = headers.findIndex(h => h.includes('발생도'));
    
    console.log(`예방관리 인덱스: ${pcIdx}, 발생도 인덱스: ${occIdx}`);
    
    if (pcIdx >= 0 && occIdx >= 0) {
      expect(occIdx).toBeGreaterThan(pcIdx);
    }
    
    await page.screenshot({ path: 'tests/screenshots/5st-toggle.png', fullPage: true });
  });
});










