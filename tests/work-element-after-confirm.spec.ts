/**
 * 작업요소 모달 - 확정 후 항목 추가 테스트
 * 확정 버튼 누른 후 새 항목 추가 시 기존 항목 유지되어야 함
 */
import { test, expect } from '@playwright/test';

test('확정 후 항목 추가 시 기존 항목 유지', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('📊') || text.includes('모달') || text.includes('확정')) {
      console.log('[브라우저]', text);
    }
  });
  
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const modal = page.locator('.fixed.bg-white.rounded-lg');
  
  // ===== 1단계: 나무 팔렛트 추가 =====
  console.log('=== 1단계: 나무 팔렛트 추가 ===');
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  await addCell.first().click();
  await page.waitForTimeout(1000);
  
  // IM 선택
  const modalSelects = modal.locator('select');
  await modalSelects.nth(1).selectOption('IM');
  
  // 나무 팔렛트 입력
  const unifiedInput = modal.locator('input[placeholder*="검색 또는"]');
  await unifiedInput.fill('나무 팔렛트');
  await unifiedInput.press('Enter');
  await page.waitForTimeout(500);
  
  // 적용
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/confirm-01-after-namu.png', fullPage: true });
  
  // 나무 팔렛트 확인
  let tableText = await page.locator('table').first().textContent();
  console.log('1단계 - 나무 팔렛트 있음:', tableText?.includes('나무 팔렛트') ? '✅' : '❌');
  expect(tableText).toContain('나무 팔렛트');
  
  // ===== 2단계: 확정 버튼 클릭 =====
  console.log('\n=== 2단계: 확정 버튼 클릭 ===');
  const confirmBtn = page.getByRole('button', { name: '확정', exact: true });
  
  // alert 처리
  page.on('dialog', async dialog => {
    console.log('Alert:', dialog.message());
    await dialog.accept();
  });
  
  await confirmBtn.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/confirm-02-after-confirm.png', fullPage: true });
  
  // 확정 후 나무 팔렛트 유지 확인
  tableText = await page.locator('table').first().textContent();
  console.log('2단계(확정 후) - 나무 팔렛트 있음:', tableText?.includes('나무 팔렛트') ? '✅' : '❌');
  expect(tableText).toContain('나무 팔렛트');
  
  // ===== 3단계: 보전원 추가 =====
  console.log('\n=== 3단계: 확정 후 보전원 추가 ===');
  
  // 나무 팔렛트 셀 클릭 (모달 열기)
  const namuCell = page.locator('td:has-text("나무 팔렛트")');
  await namuCell.first().click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/confirm-03-modal-reopen.png', fullPage: true });
  
  // 모달에서 나무 팔렛트 선택 상태 확인
  const selectedItems = await modal.locator('.bg-blue-50.border-blue-400').count();
  console.log('모달 재오픈 - 선택된 항목 수:', selectedItems);
  
  const namuInModal = await modal.locator('text=나무 팔렛트').count();
  console.log('모달에 나무 팔렛트 있음:', namuInModal > 0 ? '✅' : '❌');
  
  // 보전원 검색 및 선택
  await unifiedInput.fill('보전원');
  await page.waitForTimeout(500);
  await unifiedInput.press('Enter');
  await page.waitForTimeout(500);
  
  // 적용
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/confirm-04-final.png', fullPage: true });
  
  // ===== 4단계: 최종 확인 =====
  console.log('\n=== 4단계: 최종 확인 ===');
  tableText = await page.locator('table').first().textContent();
  
  const hasNamu = tableText?.includes('나무 팔렛트');
  const hasBojeon = tableText?.includes('보전원');
  
  console.log('최종 - 나무 팔렛트 있음:', hasNamu ? '✅' : '❌');
  console.log('최종 - 보전원 있음:', hasBojeon ? '✅' : '❌');
  
  // ✅ 핵심: 확정 후에도 기존 항목 + 새 항목 모두 있어야 함
  expect(tableText).toContain('나무 팔렛트');
  expect(tableText).toContain('보전원');
  
  console.log('\n=== 테스트 성공! ===');
});
