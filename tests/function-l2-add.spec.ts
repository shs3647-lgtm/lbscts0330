/**
 * 2L 메인공정 기능분석 - 신규 항목 추가 테스트
 * 기능 추가 후 저장 확인
 */
import { test, expect } from '@playwright/test';

test('2L 기능분석 - 신규 기능 추가 후 저장', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('📊') || text.includes('모달') || text.includes('handleApply') || text.includes('handleSave')) {
      console.log('[브라우저]', text);
    }
  });
  
  // alert 처리
  page.on('dialog', async dialog => {
    console.log('Alert:', dialog.message());
    await dialog.accept();
  });
  
  // 2L 기능분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=function-l2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/l2-func-00-initial.png', fullPage: true });
  
  // ===== 1단계: 메인공정기능 셀 클릭 =====
  console.log('=== 1단계: 메인공정기능 셀 클릭 ===');
  
  // 공정기능 선택 셀 찾기
  const funcCell = page.locator('td:has-text("공정기능 선택")').first();
  if (await funcCell.count() === 0) {
    console.log('공정기능 선택 셀 없음, 기존 기능 셀 클릭');
    const existingFuncCell = page.locator('table tbody tr td').nth(1);
    await existingFuncCell.click();
  } else {
    await funcCell.click();
  }
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/l2-func-01-modal-open.png', fullPage: true });
  
  // ===== 2단계: 모달에서 신규 항목 입력 =====
  console.log('\n=== 2단계: 신규 기능 입력 ===');
  
  const modal = page.locator('.fixed.bg-white.rounded-lg, .fixed.bg-white.shadow-2xl');
  await expect(modal).toBeVisible({ timeout: 5000 });
  
  // 검색/입력 필드 찾기
  const searchInput = modal.locator('input[placeholder*="검색"]').first();
  
  // 신규 기능 입력
  const newFuncName = '테스트신규기능_' + Date.now();
  await searchInput.fill(newFuncName);
  await page.waitForTimeout(300);
  
  // Enter로 추가
  await searchInput.press('Enter');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'test-results/l2-func-02-after-add.png', fullPage: true });
  
  // 모달에서 신규 항목이 선택되었는지 확인
  const selectedItems = await modal.locator('.bg-blue-50.border-blue-400, .bg-green-50.border-green-400').count();
  console.log('선택된 항목 수:', selectedItems);
  
  // ===== 3단계: 적용 버튼 클릭 =====
  console.log('\n=== 3단계: 적용 버튼 클릭 ===');
  const applyBtn = modal.locator('button:has-text("적용")');
  await applyBtn.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/l2-func-03-after-apply.png', fullPage: true });
  
  // ===== 4단계: 워크시트에서 확인 =====
  console.log('\n=== 4단계: 워크시트에서 확인 ===');
  const tableText = await page.locator('table').first().textContent();
  const hasNewFunc = tableText?.includes(newFuncName);
  
  console.log('신규 기능 저장됨:', hasNewFunc ? '✅' : '❌');
  console.log('테이블 텍스트 샘플:', tableText?.substring(0, 500));
  
  expect(hasNewFunc).toBe(true);
  
  console.log('\n=== 테스트 완료 ===');
});

test('2L 기능분석 - 여러 항목 추가 후 유지', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('📊') || text.includes('초기화')) {
      console.log('[브라우저]', text);
    }
  });
  
  // alert 처리
  page.on('dialog', async dialog => {
    console.log('Alert:', dialog.message());
    await dialog.accept();
  });
  
  // 2L 기능분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=function-l2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const modal = page.locator('.fixed.bg-white.rounded-lg, .fixed.bg-white.shadow-2xl');
  const timestamp = Date.now();
  
  // ===== 1단계: 첫 번째 기능 추가 =====
  console.log('=== 1단계: 첫 번째 기능 추가 ===');
  
  let funcCell = page.locator('td:has-text("공정기능 선택"), td:has-text("공정기능")').first();
  await funcCell.click();
  await page.waitForTimeout(1000);
  
  const searchInput = modal.locator('input[placeholder*="검색"]').first();
  const func1 = '기능A_' + timestamp;
  await searchInput.fill(func1);
  await searchInput.press('Enter');
  await page.waitForTimeout(300);
  
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  // 첫 번째 기능 확인
  let tableText = await page.locator('table').first().textContent();
  console.log('1단계 - 기능A 있음:', tableText?.includes(func1) ? '✅' : '❌');
  expect(tableText).toContain(func1);
  
  await page.screenshot({ path: 'test-results/l2-multi-01-after-func1.png', fullPage: true });
  
  // ===== 2단계: 두 번째 기능 추가 =====
  console.log('\n=== 2단계: 두 번째 기능 추가 ===');
  
  // 기능 셀 다시 클릭 (기능A가 있는 셀 또는 빈 셀)
  funcCell = page.locator(`td:has-text("${func1}")`).first();
  if (await funcCell.count() === 0) {
    funcCell = page.locator('td:has-text("공정기능 선택")').first();
  }
  await funcCell.click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/l2-multi-02-modal-reopen.png', fullPage: true });
  
  // 모달에서 기능A가 선택되어 있는지 확인
  const func1Selected = await modal.locator(`text=${func1}`).count();
  console.log('모달에 기능A 있음:', func1Selected > 0 ? '✅' : '❌');
  
  // 두 번째 기능 추가
  const func2 = '기능B_' + timestamp;
  await searchInput.fill(func2);
  await searchInput.press('Enter');
  await page.waitForTimeout(300);
  
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/l2-multi-03-after-func2.png', fullPage: true });
  
  // ===== 3단계: 최종 확인 =====
  console.log('\n=== 3단계: 최종 확인 ===');
  tableText = await page.locator('table').first().textContent();
  
  const hasFunc1 = tableText?.includes(func1);
  const hasFunc2 = tableText?.includes(func2);
  
  console.log('최종 - 기능A 있음:', hasFunc1 ? '✅' : '❌');
  console.log('최종 - 기능B 있음:', hasFunc2 ? '✅' : '❌');
  
  // 핵심: 둘 다 있어야 함!
  expect(hasFunc1).toBe(true);
  expect(hasFunc2).toBe(true);
  
  console.log('\n=== 테스트 성공! ===');
});
