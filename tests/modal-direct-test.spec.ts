/**
 * 작업요소 모달 직접 테스트
 */
import { test, expect } from '@playwright/test';

test('작업요소 모달 - 클릭하여 작업요소 추가', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[handleAddSave]') || text.includes('[onKeyDown]') || text.includes('연속입력')) {
      console.log('[브라우저]', text);
    }
  });
  
  // 구조분석 탭으로 이동
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=structure');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // "클릭하여 작업요소 추가" 셀 찾기 및 클릭
  console.log('=== 작업요소 추가 셀 찾기 ===');
  const addCell = page.locator('td:has-text("클릭하여 작업요소 추가")');
  const cellCount = await addCell.count();
  console.log('작업요소 추가 셀 개수:', cellCount);
  
  if (cellCount > 0) {
    await addCell.first().click();
    console.log('작업요소 추가 셀 클릭됨');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/direct-01-clicked.png', fullPage: true });
    
    // 모달 확인
    const modal = page.locator('text=작업요소 선택');
    const modalVisible = await modal.isVisible();
    console.log('모달 visible:', modalVisible);
    
    if (modalVisible) {
      await page.screenshot({ path: 'test-results/direct-02-modal.png', fullPage: true });
      
      // 4M 선택 (IM)
      console.log('\n=== IM 선택 ===');
      const m4Selects = page.locator('select');
      const selectCount = await m4Selects.count();
      console.log('select 개수:', selectCount);
      
      // 입력 영역의 4M select 찾기 (두 번째 또는 세 번째)
      for (let i = 0; i < selectCount; i++) {
        const options = await m4Selects.nth(i).locator('option').allTextContents();
        console.log(`select[${i}] options:`, options.slice(0, 5));
        if (options.includes('IM')) {
          await m4Selects.nth(i).selectOption('IM');
          console.log(`select[${i}]에서 IM 선택`);
          break;
        }
      }
      
      // 모달 내부의 입력 필드 찾기 (fixed 모달 내)
      console.log('\n=== 모달 내 입력 필드 찾기 ===');
      
      // 모달 컨테이너 찾기
      const modalContainer = page.locator('.fixed.bg-white.rounded-lg');
      const modalInputs = modalContainer.locator('input[type="text"]');
      const modalInputCount = await modalInputs.count();
      console.log('모달 내 input 개수:', modalInputCount);
      
      for (let i = 0; i < modalInputCount; i++) {
        const placeholder = await modalInputs.nth(i).getAttribute('placeholder');
        console.log(`모달 input[${i}] placeholder: ${placeholder}`);
      }
      
      // "작업요소명 입력..." 플레이스홀더를 가진 입력 필드 찾기 (검색 필드 제외)
      const workElemInput = modalContainer.locator('input[placeholder="작업요소명 입력..."]');
      const workElemInputCount = await workElemInput.count();
      console.log('작업요소명 입력 필드 개수:', workElemInputCount);
      
      if (workElemInputCount > 0) {
        // 4M select (입력 영역의 것) - 모달 내의 두 번째 select
        const modalSelects = modalContainer.locator('select');
        const modalSelectCount = await modalSelects.count();
        console.log('모달 내 select 개수:', modalSelectCount);
        
        // 입력 영역의 4M select 찾기 (MN, MC, IM, EN 옵션을 가진 것)
        for (let i = 0; i < modalSelectCount; i++) {
          const options = await modalSelects.nth(i).locator('option').allTextContents();
          console.log(`모달 select[${i}] options:`, options);
          if (options.includes('IM')) {
            await modalSelects.nth(i).selectOption('IM');
            console.log(`모달 select[${i}]에서 IM 선택`);
            break;
          }
        }
        
        // 포장지 입력
        await workElemInput.fill('포장지');
        console.log('포장지 입력됨');
        
        await page.screenshot({ path: 'test-results/direct-03-input.png', fullPage: true });
        
        // Enter 키 누르기
        await workElemInput.press('Enter');
        console.log('Enter 키 눌림');
        
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/direct-04-after-enter.png', fullPage: true });
        
        // 모달 내에서 포장지가 리스트에 추가되었는지 확인
        const addedItem = modalContainer.locator('text=포장지');
        const itemCount = await addedItem.count();
        console.log('모달 내 포장지 항목 개수:', itemCount);
        
        // 입력 필드가 비워졌는지 확인 (성공 시 비워짐)
        const inputValue = await workElemInput.inputValue();
        console.log('입력 필드 현재 값:', inputValue);
        
        // ✅ "적용" 버튼 클릭
        console.log('\n=== 적용 버튼 클릭 ===');
        const applyBtn = modalContainer.locator('button:has-text("적용")');
        const applyBtnCount = await applyBtn.count();
        console.log('적용 버튼 개수:', applyBtnCount);
        
        if (applyBtnCount > 0) {
          await applyBtn.click();
          console.log('적용 버튼 클릭됨');
          await page.waitForTimeout(2000);
          
          await page.screenshot({ path: 'test-results/direct-05-applied.png', fullPage: true });
          
          // 워크시트에 포장지가 반영되었는지 확인
          const worksheetText = await page.textContent('body');
          const hasPojangi = worksheetText?.includes('포장지');
          console.log('워크시트에 포장지 반영됨:', hasPojangi);
        }
      } else {
        console.log('작업요소 입력 필드를 찾지 못함');
      }
    }
  } else {
    console.log('작업요소 추가 셀을 찾지 못함');
    await page.screenshot({ path: 'test-results/direct-error.png', fullPage: true });
  }
});
