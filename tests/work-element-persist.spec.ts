/**
 * 작업요소 모달 - 항목 유지 테스트
 * 나무팔렛트 추가 후 보전원 추가해도 나무팔렛트가 유지되어야 함
 */
import { test, expect } from '@playwright/test';

test('작업요소 모달 - 여러 항목 추가 시 기존 항목 유지', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('📊') || text.includes('모달')) {
      console.log('[브라우저]', text);
    }
  });
  
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const modal = page.locator('.fixed.bg-white.rounded-lg');
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  
  // ===== 1단계: 나무 팔렛트 추가 =====
  console.log('=== 1단계: 나무 팔렛트 추가 ===');
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
  
  await page.screenshot({ path: 'test-results/persist-01-after-namu.png', fullPage: true });
  
  // 워크시트에 나무 팔렛트 있는지 확인
  let tableText = await page.locator('table').first().textContent();
  console.log('1단계 후 - 나무 팔렛트 있음:', tableText?.includes('나무 팔렛트') ? '✅' : '❌');
  expect(tableText).toContain('나무 팔렛트');
  
  // ===== 2단계: 보전원 추가 (기존 검색) =====
  console.log('\n=== 2단계: 보전원 추가 ===');
  
  // 나무 팔렛트가 추가된 셀을 클릭 (텍스트가 변경됨)
  const namuCell = page.locator('td:has-text("나무 팔렛트")');
  await namuCell.first().click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/persist-02-modal-reopen.png', fullPage: true });
  
  // 모달에서 기존 나무 팔렛트가 선택되어 있는지 확인
  const selectedItems = await modal.locator('.bg-blue-50.border-blue-400').count();
  console.log('모달 재오픈 후 선택된 항목 수:', selectedItems);
  
  // 나무 팔렛트가 리스트에 있는지 확인
  const namuInModal = await modal.locator('text=나무 팔렛트').count();
  console.log('모달에 나무 팔렛트 있음:', namuInModal > 0 ? '✅' : '❌');
  
  // 보전원 검색
  await unifiedInput.fill('보전원');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'test-results/persist-03-search-bojeon.png', fullPage: true });
  
  // Enter로 보전원 선택
  await unifiedInput.press('Enter');
  await page.waitForTimeout(500);
  
  // 적용
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/persist-04-after-bojeon.png', fullPage: true });
  
  // ===== 3단계: 최종 확인 =====
  console.log('\n=== 3단계: 최종 확인 ===');
  tableText = await page.locator('table').first().textContent();
  
  const hasNamu = tableText?.includes('나무 팔렛트');
  const hasBojeon = tableText?.includes('보전원');
  
  console.log('최종 - 나무 팔렛트 있음:', hasNamu ? '✅' : '❌');
  console.log('최종 - 보전원 있음:', hasBojeon ? '✅' : '❌');
  
  // ✅ 핵심 테스트: 둘 다 있어야 함!
  expect(tableText).toContain('나무 팔렛트');
  expect(tableText).toContain('보전원');
  
  console.log('\n=== 테스트 성공! ===');
});

test('작업요소 모달 - 3개 연속 추가', async ({ page }) => {
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const modal = page.locator('.fixed.bg-white.rounded-lg');
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  const unifiedInput = () => modal.locator('input[placeholder*="검색 또는"]');
  const applyBtn = () => modal.locator('button:has-text("적용")');
  const modalSelects = () => modal.locator('select');
  
  // 1. 포장지 추가 (IM)
  console.log('=== 1. 포장지 추가 ===');
  await addCell.first().click();
  await page.waitForTimeout(500);
  await modalSelects().nth(1).selectOption('IM');
  await unifiedInput().fill('포장지');
  await unifiedInput().press('Enter');
  await applyBtn().click();
  await page.waitForTimeout(1000);
  
  // 2. 작업자 선택 (기존)
  console.log('=== 2. 작업자 선택 ===');
  await addCell.first().click();
  await page.waitForTimeout(500);
  await unifiedInput().fill('작업자');
  await unifiedInput().press('Enter');
  await applyBtn().click();
  await page.waitForTimeout(1000);
  
  // 3. 비닐 추가 (IM)
  console.log('=== 3. 비닐 추가 ===');
  await addCell.first().click();
  await page.waitForTimeout(500);
  await modalSelects().nth(1).selectOption('IM');
  await unifiedInput().fill('비닐');
  await unifiedInput().press('Enter');
  await applyBtn().click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/persist-3items.png', fullPage: true });
  
  // 최종 확인
  const tableText = await page.locator('table').first().textContent();
  console.log('\n=== 최종 확인 ===');
  console.log('포장지:', tableText?.includes('포장지') ? '✅' : '❌');
  console.log('작업자:', tableText?.includes('작업자') ? '✅' : '❌');
  console.log('비닐:', tableText?.includes('비닐') ? '✅' : '❌');
  
  expect(tableText).toContain('포장지');
  expect(tableText).toContain('작업자');
  expect(tableText).toContain('비닐');
});
