/**
 * CP 워크시트 시각적 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('CP 워크시트 시각적 확인', async ({ page }) => {
  // 콘솔 로그
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CP') || text.includes('로드') || text.includes('저장')) {
      console.log(`[Browser] ${text}`);
    }
  });

  // 먼저 데이터 재생성
  console.log('🔄 데이터 재생성...');
  const masterResponse = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/master-data');
  const masterData = await masterResponse.json();
  
  if (masterData.success && masterData.flatData) {
    await page.request.post('http://localhost:3001/api/control-plan/master-to-worksheet', {
      data: {
        cpNo: 'cp26-m001',
        flatData: masterData.flatData
      }
    });
    console.log('✅ 데이터 재생성 완료');
  }

  // 페이지 이동 전 2초 대기
  await page.waitForTimeout(2000);

  // CP 워크시트 페이지로 이동
  console.log('🔍 CP 워크시트 페이지로 이동...');
  await page.goto('http://localhost:3001/control-plan/worksheet?cpNo=cp26-m001', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // 스크린샷
  await page.screenshot({ path: 'test-results/visual-check.png', fullPage: true });

  // 첫 번째 행 데이터 확인
  const firstDataRow = page.locator('tbody tr').first();
  const cells = firstDataRow.locator('td');
  
  // E열 (설비/금형/JIG) 확인
  const cellE = cells.nth(5);
  const cellEText = await cellE.textContent();
  console.log(`E열(설비/금형): "${cellEText?.trim()}"`);
  
  // P열 (관리방법) 확인 - input의 value 속성 확인
  const cellP = cells.nth(16);
  const inputP = cellP.locator('input');
  
  if (await inputP.count() > 0) {
    const inputValue = await inputP.inputValue();
    console.log(`P열(관리방법) input value: "${inputValue}"`);
  } else {
    const cellPText = await cellP.textContent();
    console.log(`P열(관리방법) text: "${cellPText?.trim()}"`);
  }

  // O열 (주기) 확인 - select의 value 확인
  const cellO = cells.nth(15);
  const selectO = cellO.locator('select');
  if (await selectO.count() > 0) {
    const selectValue = await selectO.inputValue();
    console.log(`O열(주기) select value: "${selectValue}"`);
  }

  // Q열 (책임1) 확인
  const cellQ = cells.nth(17);
  const selectQ = cellQ.locator('select');
  if (await selectQ.count() > 0) {
    const selectValue = await selectQ.inputValue();
    console.log(`Q열(책임1) select value: "${selectValue}"`);
  }

  // R열 (책임2) 확인
  const cellR = cells.nth(18);
  const selectR = cellR.locator('select');
  if (await selectR.count() > 0) {
    const selectValue = await selectR.inputValue();
    console.log(`R열(책임2) select value: "${selectValue}"`);
  }

  // F열 (EP) 확인
  const cellF = cells.nth(6);
  const cellFText = await cellF.textContent();
  console.log(`F열(EP): "${cellFText?.trim()}"`);

  // G열 (자동) 확인
  const cellG = cells.nth(7);
  const cellGText = await cellG.textContent();
  console.log(`G열(자동): "${cellGText?.trim()}"`);

  // 대기 (브라우저 확인용)
  await page.waitForTimeout(30000);
});
