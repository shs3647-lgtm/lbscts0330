/**
 * 작업요소 모달 - 확정 성공 후 항목 추가 테스트
 * 공정 선택 -> 작업요소 추가 -> 확정 성공 -> 새 항목 추가 시 기존 항목 유지
 */
import { test, expect } from '@playwright/test';

test('확정 성공 후 항목 추가 시 기존 항목 유지', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('📊') || text.includes('모달') || text.includes('확정') || text.includes('저장')) {
      console.log('[브라우저]', text);
    }
  });
  
  // alert 처리
  page.on('dialog', async dialog => {
    console.log('Alert:', dialog.message());
    await dialog.accept();
  });
  
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // ===== 0단계: 공정 선택 =====
  console.log('=== 0단계: 공정 선택 ===');
  const processCell = page.locator('td:has-text("클릭하여 공정 선택")');
  if (await processCell.count() > 0) {
    await processCell.first().click();
    await page.waitForTimeout(1500);
    
    // 공정 선택 모달에서 항목 클릭
    const processItem = page.locator('text=10-입고검사').first();
    if (await processItem.count() > 0) {
      await processItem.click();
      await page.waitForTimeout(500);
    } else {
      // 첫 번째 공정 항목 클릭
      const firstProcess = page.locator('.fixed.bg-white').locator('div.cursor-pointer').first();
      if (await firstProcess.count() > 0) {
        await firstProcess.click();
        await page.waitForTimeout(500);
      }
    }
    
    // 적용 버튼 클릭
    const applyBtn = page.locator('.fixed.bg-white').locator('button:has-text("적용")');
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      await page.waitForTimeout(1500);
    }
    
    // 모달이 아직 열려있으면 닫기
    const closeBtn = page.locator('.fixed.bg-white').locator('button:has-text("닫기")');
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }
  
  await page.screenshot({ path: 'test-results/confirm-success-00-process.png', fullPage: true });
  
  // 모달이 닫힐 때까지 대기
  await page.waitForTimeout(1000);
  
  // ===== 1단계: 나무 팔렛트 추가 =====
  console.log('\n=== 1단계: 나무 팔렛트 추가 ===');
  const modal = page.locator('.fixed.bg-white.rounded-lg');
  
  // 작업요소 셀 클릭
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  if (await addCell.count() > 0) {
    await addCell.first().click();
  } else {
    // 이미 항목이 있는 경우 해당 셀 클릭
    const l3Cell = page.locator('table tr td').nth(3);
    await l3Cell.click();
  }
  await page.waitForTimeout(1000);
  
  // IM 선택 및 나무 팔렛트 입력
  const modalSelects = modal.locator('select');
  if (await modalSelects.count() > 1) {
    await modalSelects.nth(1).selectOption('IM');
  }
  
  const unifiedInput = modal.locator('input[placeholder*="검색 또는"]');
  await unifiedInput.fill('나무 팔렛트');
  await unifiedInput.press('Enter');
  await page.waitForTimeout(500);
  
  // 적용
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/confirm-success-01-namu.png', fullPage: true });
  
  let tableText = await page.locator('table').first().textContent();
  console.log('1단계 - 나무 팔렛트 있음:', tableText?.includes('나무 팔렛트') ? '✅' : '❌');
  
  // ===== 2단계: 확정 시도 =====
  console.log('\n=== 2단계: 확정 버튼 클릭 ===');
  const confirmBtn = page.getByRole('button', { name: '확정', exact: true });
  await confirmBtn.click();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/confirm-success-02-confirm.png', fullPage: true });
  
  // 확정 후 상태 확인
  tableText = await page.locator('table').first().textContent();
  console.log('2단계(확정 후) - 나무 팔렛트 있음:', tableText?.includes('나무 팔렛트') ? '✅' : '❌');
  
  // ===== 3단계: 확정 후 보전원 추가 =====
  console.log('\n=== 3단계: 확정 후 보전원 추가 ===');
  
  // 나무 팔렛트 셀 또는 작업요소 셀 클릭
  const namuCell = page.locator('td:has-text("나무 팔렛트")');
  const addCellAgain = page.locator('td:has-text("클릭하여 작업요소 추가")');
  
  if (await namuCell.count() > 0) {
    await namuCell.first().click();
  } else if (await addCellAgain.count() > 0) {
    await addCellAgain.first().click();
  }
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/confirm-success-03-modal.png', fullPage: true });
  
  // 모달 상태 확인
  const selectedCount = await modal.locator('.bg-blue-50.border-blue-400').count();
  console.log('모달 재오픈 - 선택된 항목 수:', selectedCount);
  
  const namuInModal = await modal.locator('text=나무 팔렛트').count();
  console.log('모달에 나무 팔렛트 있음:', namuInModal > 0 ? '✅' : '❌');
  
  // 보전원 검색
  await unifiedInput.fill('보전원');
  await page.waitForTimeout(500);
  await unifiedInput.press('Enter');
  await page.waitForTimeout(500);
  
  // 적용
  await modal.locator('button:has-text("적용")').click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/confirm-success-04-final.png', fullPage: true });
  
  // ===== 4단계: 최종 확인 =====
  console.log('\n=== 4단계: 최종 확인 ===');
  tableText = await page.locator('table').first().textContent();
  
  const hasNamu = tableText?.includes('나무 팔렛트');
  const hasBojeon = tableText?.includes('보전원');
  
  console.log('최종 - 나무 팔렛트 있음:', hasNamu ? '✅' : '❌');
  console.log('최종 - 보전원 있음:', hasBojeon ? '✅' : '❌');
  
  // 핵심: 둘 다 있어야 함
  expect(hasNamu).toBe(true);
  expect(hasBojeon).toBe(true);
  
  console.log('\n=== 테스트 성공! ===');
});
