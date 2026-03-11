/**
 * 작업요소 모달 - 통합 입력 테스트 (검색+입력 통합)
 */
import { test, expect } from '@playwright/test';

test('작업요소 모달 - 통합 입력으로 IM 나무 팔렛트 추가', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('🟢') || text.includes('선택') || text.includes('추가')) {
      console.log('[브라우저]', text);
    }
  });
  
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // "클릭하여 작업요소 추가" 셀 클릭
  console.log('=== 1. 작업요소 추가 셀 클릭 ===');
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  await addCell.first().click();
  await page.waitForTimeout(1000);
  
  // 모달 컨테이너
  const modal = page.locator('.fixed.bg-white.rounded-lg');
  const isModalVisible = await modal.isVisible();
  console.log('모달 visible:', isModalVisible);
  
  if (!isModalVisible) {
    await page.screenshot({ path: 'test-results/unified-error.png', fullPage: true });
    return;
  }
  
  await page.screenshot({ path: 'test-results/unified-01-modal.png', fullPage: true });
  
  // ===== 통합 입력 필드 확인 =====
  console.log('\n=== 2. 통합 입력 필드 확인 ===');
  const unifiedInput = modal.locator('input[placeholder*="검색 또는"]');
  const inputExists = await unifiedInput.count();
  console.log('통합 입력 필드 존재:', inputExists > 0);
  
  // ===== 4M 선택 (새 항목용) =====
  console.log('\n=== 3. 4M 선택 (IM) ===');
  const modalSelects = modal.locator('select');
  const selectCount = await modalSelects.count();
  console.log('select 개수:', selectCount);
  
  // 두 번째 select가 4M 선택 (첫 번째는 필터)
  if (selectCount >= 2) {
    await modalSelects.nth(1).selectOption('IM');
    const selectedValue = await modalSelects.nth(1).inputValue();
    console.log('선택된 4M:', selectedValue);
  }
  
  // ===== "나무 팔렛트" 입력 =====
  console.log('\n=== 4. 나무 팔렛트 입력 ===');
  await unifiedInput.fill('나무 팔렛트');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'test-results/unified-02-input.png', fullPage: true });
  
  // 힌트 메시지 확인
  const hintText = await modal.locator('text="나무 팔렛트" 새로 추가').count();
  console.log('새로 추가 힌트 표시:', hintText > 0);
  
  // ===== Enter 키 눌러 추가 =====
  console.log('\n=== 5. Enter 키 눌러 추가 ===');
  await unifiedInput.press('Enter');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-results/unified-03-after-enter.png', fullPage: true });
  
  // 입력 필드가 비워졌는지 확인
  const inputValue = await unifiedInput.inputValue();
  console.log('Enter 후 입력 필드:', inputValue === '' ? '비워짐 ✅' : inputValue);
  
  // 모달 내 "나무 팔렛트" 항목 확인
  const addedItem = modal.locator('text=나무 팔렛트');
  const itemCount = await addedItem.count();
  console.log('모달 내 "나무 팔렛트" 항목:', itemCount > 0 ? `${itemCount}개 ✅` : '없음');
  
  // ===== 적용 버튼 클릭 =====
  console.log('\n=== 6. 적용 버튼 클릭 ===');
  const applyBtn = modal.locator('button:has-text("적용")');
  await applyBtn.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test-results/unified-04-applied.png', fullPage: true });
  
  // ===== 워크시트 확인 =====
  console.log('\n=== 7. 워크시트 확인 ===');
  const tableText = await page.locator('table').first().textContent();
  const hasNamuPallet = tableText?.includes('나무 팔렛트');
  console.log('워크시트에 "나무 팔렛트" 반영:', hasNamuPallet ? '✅' : '❌');
  
  // IM 확인
  const hasIM = tableText?.includes('IM');
  console.log('워크시트에 "IM" 반영:', hasIM ? '✅' : '❌');
  
  // 결과 요약
  console.log('\n=== 결과 요약 ===');
  console.log('1. 모달 열림:', isModalVisible ? '✅' : '❌');
  console.log('2. 통합 입력 필드 존재:', inputExists > 0 ? '✅' : '❌');
  console.log('3. 모달에 항목 추가됨:', itemCount > 0 ? '✅' : '❌');
  console.log('4. 입력 필드 초기화:', inputValue === '' ? '✅' : '❌');
  console.log('5. 워크시트 반영:', hasNamuPallet ? '✅' : '❌');
});

test('작업요소 모달 - 검색으로 기존 항목 선택', async ({ page }) => {
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 모달 열기
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  await addCell.first().click();
  await page.waitForTimeout(1000);
  
  const modal = page.locator('.fixed.bg-white.rounded-lg');
  
  // 통합 입력 필드에 "작업자" 검색
  console.log('=== 1. "작업자" 검색 ===');
  const unifiedInput = modal.locator('input[placeholder*="검색 또는"]');
  await unifiedInput.fill('작업자');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'test-results/search-01.png', fullPage: true });
  
  // 검색 결과 확인
  const searchResults = modal.locator('text=00작업자');
  const resultCount = await searchResults.count();
  console.log('검색 결과 "00작업자":', resultCount > 0 ? `${resultCount}개 ✅` : '없음');
  
  // Enter로 선택
  console.log('\n=== 2. Enter로 선택 ===');
  await unifiedInput.press('Enter');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'test-results/search-02-selected.png', fullPage: true });
  
  // 선택 확인 (체크박스 상태)
  const selectedCount = await modal.locator('.bg-blue-500.border-blue-500').count();
  console.log('선택된 항목 수:', selectedCount);
  
  // 적용
  const applyBtn = modal.locator('button:has-text("적용")');
  await applyBtn.click();
  await page.waitForTimeout(1000);
  
  // 워크시트 확인
  const tableText = await page.locator('table').first().textContent();
  const hasWorker = tableText?.includes('00작업자');
  console.log('워크시트에 "00작업자" 반영:', hasWorker ? '✅' : '❌');
  
  await page.screenshot({ path: 'test-results/search-03-applied.png', fullPage: true });
});
