/**
 * CP 구조연동 결과 검증 테스트
 */
import { test, expect } from '@playwright/test';

test.describe('CP 구조연동 검증', () => {
  
  test('FMEA에서 CP 구조연동 후 CP 화면에 반영 확인', async ({ page }) => {
    // 1. FMEA 워크시트 페이지 열기
    console.log('=== 1단계: FMEA 워크시트 열기 ===');
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // FMEA 데이터 확인
    const fmeaSelect = page.locator('select').first();
    const selectedValue = await fmeaSelect.inputValue();
    console.log('선택된 FMEA ID:', selectedValue);
    
    // 2. CP 구조연동 실행
    console.log('=== 2단계: CP 구조연동 실행 ===');
    
    // 다이얼로그 핸들러
    const dialogMessages: string[] = [];
    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      console.log('다이얼로그:', dialog.message());
      await dialog.accept();
    });
    
    // CP 연동 버튼 클릭
    const cpSyncButton = page.locator('[data-testid="cp-sync-button"]');
    await cpSyncButton.waitFor({ state: 'visible', timeout: 10000 });
    await cpSyncButton.click();
    await page.waitForTimeout(500);
    
    // CP 구조연동 클릭
    const structureSyncButton = page.locator('button:has-text("CP 구조연동")');
    await structureSyncButton.click();
    console.log('CP 구조연동 클릭됨');
    
    await page.waitForTimeout(3000);
    console.log('다이얼로그 메시지들:', dialogMessages);
    
    // 스크린샷
    await page.screenshot({ path: 'test-results/sync-01-fmea-after-sync.png', fullPage: true });
    
    // 3. CP 화면으로 이동
    console.log('=== 3단계: CP 화면으로 이동 ===');
    await page.goto('http://localhost:3000/control-plan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/sync-02-cp-list.png', fullPage: true });
    
    // CP 목록 확인
    const cpList = page.locator('table tbody tr');
    const cpCount = await cpList.count();
    console.log('CP 목록 행 개수:', cpCount);
    
    // 연결된 CP 찾기 (cp26-m001)
    const linkedCp = page.locator('text=cp26-m001');
    const linkedCpExists = await linkedCp.count();
    console.log('연결된 CP (cp26-m001) 존재:', linkedCpExists > 0);
    
    if (linkedCpExists > 0) {
      // CP 클릭하여 상세 페이지로 이동
      await linkedCp.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/sync-03-cp-detail.png', fullPage: true });
      
      // CP 워크시트 데이터 확인
      const cpRows = page.locator('table tbody tr');
      const cpRowCount = await cpRows.count();
      console.log('CP 워크시트 행 개수:', cpRowCount);
      
      // 공정명 확인
      const processNames = page.locator('td:has-text("자재입고"), td:has-text("수입검사"), td:has-text("MB Mixing")');
      const processCount = await processNames.count();
      console.log('FMEA 공정명이 CP에 반영된 개수:', processCount);
    }
    
    // 4. API로 직접 CP 데이터 확인
    console.log('=== 4단계: API로 CP 데이터 확인 ===');
    const cpApiResponse = await page.request.get('http://localhost:3000/api/control-plan?fmeaId=PFM26-M001');
    const cpApiData = await cpApiResponse.json();
    console.log('CP API 응답:', JSON.stringify(cpApiData, null, 2).substring(0, 500));
    
    // CP 상세 데이터 확인
    if (cpApiData.data && cpApiData.data.length > 0) {
      const cpId = cpApiData.data[0].id;
      console.log('연결된 CP ID:', cpId);
      
      const cpDetailResponse = await page.request.get(`http://localhost:3000/api/control-plan/${cpId}`);
      const cpDetailData = await cpDetailResponse.json();
      console.log('CP 상세 데이터:', JSON.stringify(cpDetailData, null, 2).substring(0, 1000));
      
      // items 확인
      if (cpDetailData.data?.items) {
        console.log('CP 아이템 개수:', cpDetailData.data.items.length);
        cpDetailData.data.items.forEach((item: any, idx: number) => {
          console.log(`  아이템 ${idx}: 공정=${item.processName}, 제품특성=${item.productChar}`);
        });
      }
    }
  });

  test('구조 연동 API 직접 테스트', async ({ page }) => {
    console.log('=== 구조 연동 API 직접 테스트 ===');
    
    // API 직접 호출
    const response = await page.request.post('http://localhost:3000/api/sync/structure', {
      data: {
        direction: 'fmea-to-cp',
        sourceId: 'PFM26-M001',
        targetId: 'cp26-m001'
      }
    });
    
    const responseData = await response.json();
    console.log('API 응답 상태:', response.status());
    console.log('API 응답 데이터:', JSON.stringify(responseData, null, 2));
    
    expect(response.status()).toBe(200);
  });
});
