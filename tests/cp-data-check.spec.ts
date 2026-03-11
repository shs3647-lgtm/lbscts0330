/**
 * CP 데이터 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('CP 데이터 API 확인', async ({ page }) => {
  // 1. CP 목록 API
  console.log('=== CP 목록 확인 ===');
  const cpListResponse = await page.request.get('http://localhost:3000/api/control-plan?fmeaId=PFM26-M001');
  const cpListData = await cpListResponse.json();
  console.log('CP 목록:', JSON.stringify(cpListData, null, 2));
  
  if (cpListData.data && cpListData.data.length > 0) {
    const cpId = cpListData.data[0].id;
    console.log('\n=== CP 상세 데이터 확인 (ID:', cpId, ') ===');
    
    // 2. CP 상세 API
    const cpDetailResponse = await page.request.get(`http://localhost:3000/api/control-plan/${cpId}`);
    const cpDetailData = await cpDetailResponse.json();
    console.log('CP 상세:', JSON.stringify(cpDetailData, null, 2));
    
    // 3. items 확인
    if (cpDetailData.data?.items) {
      console.log('\n=== CP 아이템 목록 ===');
      console.log('아이템 개수:', cpDetailData.data.items.length);
      cpDetailData.data.items.forEach((item: any, idx: number) => {
        console.log(`[${idx}] 공정: ${item.processName}, 제품특성: ${item.productChar}, 공정특성: ${item.processChar}`);
      });
    } else {
      console.log('⚠️ items가 없습니다!');
    }
  }
  
  // 4. FMEA 구조 데이터 확인
  console.log('\n=== FMEA 구조 데이터 확인 ===');
  const fmeaResponse = await page.request.get('http://localhost:3000/api/fmea/PFM26-M001');
  const fmeaData = await fmeaResponse.json();
  
  if (fmeaData.data?.l2Structures) {
    console.log('L2 구조 개수:', fmeaData.data.l2Structures.length);
    fmeaData.data.l2Structures.forEach((l2: any, idx: number) => {
      console.log(`[${idx}] L2: ${l2.processName}`);
      if (l2.l3Structures) {
        l2.l3Structures.forEach((l3: any, l3idx: number) => {
          console.log(`  [${l3idx}] L3: ${l3.processChar || l3.productChar}`);
        });
      }
    });
  }
});

test('CP 워크시트 화면 확인', async ({ page }) => {
  // CP 워크시트 페이지 열기
  await page.goto('http://localhost:3000/control-plan/worksheet?id=cp26-m001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/cp-worksheet.png', fullPage: true });
  
  // 테이블 데이터 확인
  const tableRows = page.locator('table tbody tr');
  const rowCount = await tableRows.count();
  console.log('CP 워크시트 행 개수:', rowCount);
  
  // 첫 번째 몇 개 행의 내용 확인
  for (let i = 0; i < Math.min(rowCount, 5); i++) {
    const row = tableRows.nth(i);
    const cells = row.locator('td');
    const cellCount = await cells.count();
    const cellTexts: string[] = [];
    for (let j = 0; j < Math.min(cellCount, 5); j++) {
      const text = await cells.nth(j).textContent();
      cellTexts.push(text?.trim() || '');
    }
    console.log(`행 ${i}:`, cellTexts.join(' | '));
  }
});
