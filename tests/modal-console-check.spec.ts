/**
 * 작업요소 모달 콘솔 로그 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('작업요소 모달 - 콘솔 로그 확인', async ({ page }) => {
  // 콘솔 로그 캡처
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[handleAddSave]') || text.includes('[onKeyDown]') || text.includes('연속입력')) {
      consoleLogs.push(text);
      console.log('[브라우저 콘솔]', text);
    }
  });
  
  // FMEA 워크시트 열기
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  // 페이지 구조 확인
  await page.screenshot({ path: 'test-results/console-01-page.png', fullPage: true });
  
  // 모든 클릭 가능한 셀 찾기
  console.log('=== 클릭 가능한 셀 찾기 ===');
  
  // 작업요소 컬럼 헤더 찾기
  const headers = await page.locator('th, .bg-amber-100, .bg-amber-200').allTextContents();
  console.log('테이블 헤더들:', headers.slice(0, 10));
  
  // 작업요소 셀 클릭 시도 (다양한 선택자)
  const selectors = [
    'td:has-text("작업자")',
    'td:has-text("MN")',
    '.bg-amber-50',
    '[data-column="workElement"]',
    'td:nth-child(5)', // 5번째 컬럼
  ];
  
  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    console.log(`선택자 "${selector}": ${count}개`);
    
    if (count > 0) {
      const firstElement = page.locator(selector).first();
      const text = await firstElement.textContent();
      console.log(`  첫 번째 요소 텍스트: "${text?.substring(0, 50)}"`);
    }
  }
  
  // 모달을 강제로 열기 위해 JavaScript 실행
  console.log('\n=== 모달 상태 확인 ===');
  const modalExists = await page.locator('.fixed.inset-0.z-\\[9999\\]').count();
  console.log('모달 존재:', modalExists);
  
  // 콘솔 로그 출력
  console.log('\n=== 캡처된 콘솔 로그 ===');
  consoleLogs.forEach(log => console.log(log));
});

test('작업요소 모달 - 직접 URL로 테스트', async ({ page }) => {
  // 콘솔 로그 캡처
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
  });
  
  // 구조분석 탭으로 직접 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'test-results/console-02-structure.png', fullPage: true });
  
  // 모든 td 요소 텍스트 확인
  const allTds = page.locator('td');
  const tdCount = await allTds.count();
  console.log('총 td 개수:', tdCount);
  
  // 처음 20개 td 텍스트 확인
  for (let i = 0; i < Math.min(tdCount, 20); i++) {
    const text = await allTds.nth(i).textContent();
    if (text && text.trim()) {
      console.log(`td[${i}]: "${text.trim().substring(0, 30)}"`);
    }
  }
  
  // 관련 콘솔 로그 출력
  console.log('\n=== 관련 콘솔 로그 ===');
  const relevantLogs = consoleLogs.filter(log => 
    log.includes('handleAddSave') || 
    log.includes('onKeyDown') || 
    log.includes('모달') ||
    log.includes('작업요소')
  );
  relevantLogs.forEach(log => console.log(log));
});
