/**
 * CP 워크시트 컬럼 디버깅 테스트
 */
import { test, expect } from '@playwright/test';

test('CP 워크시트 컬럼 디버깅', async ({ page }) => {
  // CP 워크시트 페이지로 이동
  await page.goto('http://localhost:3001/control-plan/worksheet');
  await page.waitForTimeout(4000);

  // 첫 번째 데이터 행 찾기
  const firstDataRow = page.locator('tbody tr').first();
  const cells = firstDataRow.locator('td');
  const cellCount = await cells.count();
  
  console.log(`📊 첫 행의 셀 수: ${cellCount}`);
  
  // 모든 셀 내용 출력
  for (let i = 0; i < Math.min(20, cellCount); i++) {
    const cell = cells.nth(i);
    const text = await cell.textContent();
    const cleanText = text?.replace(/\s+/g, ' ').trim().substring(0, 50) || '';
    console.log(`셀 ${i}: "${cleanText}"`);
  }

  // 데이터 행 분석
  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();
  console.log(`\n📊 총 행 수: ${rowCount}`);

  // 워크시트 구조 (CP_COLUMNS 기준)
  console.log('\n=== CP 워크시트 컬럼 구조 ===');
  console.log('0: rowNo (단계)');
  console.log('1: processNo (공정번호) - A');
  console.log('2: processName (공정명) - B');
  console.log('3: processLevel (레벨) - C');
  console.log('4: processDesc (공정설명) - D');
  console.log('5: workElement (설비/금형/JIG) - E');
  console.log('6: detectorEp (EP) - F');
  console.log('7: detectorAuto (자동) - G');
  console.log('8: charNo (NO) - H');
  console.log('9: productChar (제품특성) - I');
  console.log('10: processChar (공정특성) - J');
  console.log('11: specialChar (특별특성) - K');
  console.log('12: specTolerance (스펙/공차) - L');
  console.log('13: evalMethod (평가방법) - M');
  console.log('14: sampleSize (샘플크기) - N');
  console.log('15: sampleFreq (주기) - O');
  console.log('16: controlMethod (관리방법) - P');
  console.log('17: owner1 (책임1) - Q');
  console.log('18: owner2 (책임2) - R');
  console.log('19: reactionPlan (대응계획) - S');

  await page.waitForTimeout(30000);
});
