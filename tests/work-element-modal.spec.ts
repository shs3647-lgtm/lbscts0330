/**
 * 작업요소 모달 직접입력 테스트
 */
import { test, expect } from '@playwright/test';

test('작업요소 모달 - IM 선택 후 직접입력', async ({ page }) => {
  console.log('=== 작업요소 모달 직접입력 테스트 ===');
  
  // 1. FMEA 워크시트 열기
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // FMEA 선택 (드롭다운에서 선택)
  const fmeaSelect = page.locator('select').first();
  const options = await fmeaSelect.locator('option').allTextContents();
  console.log('FMEA 옵션들:', options);
  
  // AI FMEA 개발 선택
  const targetOption = options.find(opt => opt.includes('AI FMEA') || opt.includes('PFM26'));
  if (targetOption) {
    await fmeaSelect.selectOption({ label: targetOption });
    console.log('FMEA 선택됨:', targetOption);
    await page.waitForTimeout(3000);
  }
  
  await page.screenshot({ path: 'test-results/modal-01-worksheet.png', fullPage: true });
  
  // 2. 작업요소 셀 찾기 (구조분석 탭의 작업요소 컬럼)
  console.log('2. 작업요소 셀 찾기');
  
  // 작업요소 컬럼 클릭 (첫 번째 행)
  const workElementCell = page.locator('td:has-text("00작업자")').first();
  const cellExists = await workElementCell.count();
  console.log('작업요소 셀 존재:', cellExists > 0);
  
  if (cellExists > 0) {
    await workElementCell.click();
    console.log('작업요소 셀 클릭됨');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/modal-02-cell-clicked.png', fullPage: true });
  }
  
  // 3. 모달이 열렸는지 확인
  console.log('3. 모달 확인');
  const modal = page.locator('text=작업요소 선택');
  const modalVisible = await modal.isVisible().catch(() => false);
  console.log('모달 visible:', modalVisible);
  
  if (modalVisible) {
    await page.screenshot({ path: 'test-results/modal-03-opened.png', fullPage: true });
    
    // 4. IM 선택
    console.log('4. IM 선택');
    const m4Select = page.locator('select').first();
    await m4Select.selectOption('IM');
    console.log('IM 선택됨');
    
    // 5. 직접입력 필드에 "포장지" 입력
    console.log('5. 직접입력');
    const inputField = page.locator('input[placeholder*="작업요소명"]');
    await inputField.fill('포장지');
    console.log('포장지 입력됨');
    
    await page.screenshot({ path: 'test-results/modal-04-input.png', fullPage: true });
    
    // 6. Enter 키 누르기
    console.log('6. Enter 키 누르기');
    await inputField.press('Enter');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/modal-05-after-enter.png', fullPage: true });
    
    // 7. 포장지가 리스트에 추가되었는지 확인
    const addedItem = page.locator('text=포장지');
    const itemAdded = await addedItem.count();
    console.log('포장지 항목 추가됨:', itemAdded > 0);
    
    // 8. 모달의 리스트 확인
    const listItems = page.locator('.grid.grid-cols-2 > div');
    const listCount = await listItems.count();
    console.log('리스트 항목 개수:', listCount);
  } else {
    console.log('모달이 열리지 않음 - 다른 방법으로 모달 열기 시도');
    
    // 구조분석 탭으로 이동
    const structureTab = page.locator('button:has-text("구조분석")');
    if (await structureTab.count() > 0) {
      await structureTab.click();
      await page.waitForTimeout(1000);
      console.log('구조분석 탭 클릭됨');
    }
    
    await page.screenshot({ path: 'test-results/modal-06-structure-tab.png', fullPage: true });
  }
});

test('작업요소 모달 - 연속입력 모드 테스트', async ({ page }) => {
  console.log('=== 연속입력 모드 테스트 ===');
  
  // FMEA 워크시트 열기
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 작업요소 모달 열기 시도
  const workElementCell = page.locator('td:has-text("00작업자")').first();
  if (await workElementCell.count() > 0) {
    await workElementCell.click();
    await page.waitForTimeout(1000);
  }
  
  // 모달이 열렸으면 연속입력 버튼 확인
  const continuousBtn = page.locator('button:has-text("연속입력")');
  const btnExists = await continuousBtn.count();
  console.log('연속입력 버튼 존재:', btnExists > 0);
  
  if (btnExists > 0) {
    // 연속입력 모드 활성화
    await continuousBtn.click();
    console.log('연속입력 모드 활성화');
    await page.waitForTimeout(500);
    
    // IM 선택
    const m4Selects = page.locator('select');
    const selectCount = await m4Selects.count();
    console.log('select 개수:', selectCount);
    
    // 두 번째 select가 4M 선택 (입력 영역의 select)
    if (selectCount >= 2) {
      await m4Selects.nth(1).selectOption('IM');
      console.log('IM 선택됨');
    }
    
    // 입력 필드 찾기
    const inputFields = page.locator('input[type="text"]');
    const inputCount = await inputFields.count();
    console.log('input 개수:', inputCount);
    
    // 입력 필드에 값 입력
    for (let i = 0; i < inputCount; i++) {
      const placeholder = await inputFields.nth(i).getAttribute('placeholder');
      console.log(`input[${i}] placeholder: ${placeholder}`);
      if (placeholder?.includes('입력')) {
        await inputFields.nth(i).fill('테스트포장지');
        await inputFields.nth(i).press('Enter');
        console.log('테스트포장지 입력 및 Enter');
        break;
      }
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/modal-continuous.png', fullPage: true });
    
    // 추가 확인
    const addedItem = page.locator('text=테스트포장지');
    const added = await addedItem.count();
    console.log('테스트포장지 추가됨:', added > 0);
  }
});
