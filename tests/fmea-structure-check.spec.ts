/**
 * FMEA 구조 데이터 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('FMEA 구조 데이터 상세 확인', async ({ page }) => {
  console.log('=== FMEA 구조 데이터 확인 ===');
  
  // L2Structure API 직접 확인
  const l2Response = await page.request.get('http://localhost:3000/api/structure?fmeaId=PFM26-M001&level=l2');
  console.log('L2 API 상태:', l2Response.status());
  
  if (l2Response.status() === 200) {
    const l2Data = await l2Response.json();
    console.log('L2 데이터:', JSON.stringify(l2Data, null, 2).substring(0, 2000));
  }
  
  // sync/structure API로 확인 (GET)
  const syncResponse = await page.request.get('http://localhost:3000/api/sync/structure?fmeaId=PFM26-M001');
  console.log('\nSync API GET 상태:', syncResponse.status());
  if (syncResponse.status() === 200) {
    const syncData = await syncResponse.json();
    console.log('Sync 데이터:', JSON.stringify(syncData, null, 2).substring(0, 1000));
  }
});

test('FMEA 워크시트 데이터 확인', async ({ page }) => {
  // FMEA 워크시트 페이지 열기
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 네트워크 요청 모니터링
  const apiCalls: any[] = [];
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      const url = res.url();
      const status = res.status();
      let data = null;
      try {
        data = await res.json();
      } catch {}
      apiCalls.push({ url, status, data: data ? JSON.stringify(data).substring(0, 500) : null });
    }
  });
  
  await page.waitForTimeout(2000);
  
  console.log('\n=== FMEA 워크시트 API 호출 ===');
  apiCalls.forEach((call, idx) => {
    console.log(`[${idx}] ${call.url} - ${call.status}`);
    if (call.data) {
      console.log(`    데이터: ${call.data.substring(0, 200)}...`);
    }
  });
  
  await page.screenshot({ path: 'test-results/fmea-worksheet-structure.png', fullPage: true });
});

test('DB에서 L2Structure 직접 조회', async ({ page }) => {
  // API를 통해 L2Structure와 관련 데이터 조회
  // /api/pfmea API 확인
  const pfmeaResponse = await page.request.get('http://localhost:3000/api/pfmea/PFM26-M001');
  console.log('PFMEA API 상태:', pfmeaResponse.status());
  
  if (pfmeaResponse.status() === 200) {
    const pfmeaData = await pfmeaResponse.json();
    console.log('PFMEA 데이터 키:', Object.keys(pfmeaData.data || pfmeaData || {}));
    
    // l2Structures 확인
    const l2s = pfmeaData.data?.l2Structures || pfmeaData.l2Structures || pfmeaData.data?.l2 || [];
    console.log('L2 구조 개수:', l2s.length);
    
    if (l2s.length > 0) {
      l2s.forEach((l2: any, idx: number) => {
        console.log(`\n[L2 #${idx}] ${l2.name || l2.processName}`);
        console.log('  - ID:', l2.id);
        console.log('  - No:', l2.no);
        console.log('  - l3Structures:', l2.l3Structures?.length || 0);
        console.log('  - l2Functions:', l2.l2Functions?.length || 0);
        
        if (l2.l3Structures) {
          l2.l3Structures.forEach((l3: any, l3idx: number) => {
            console.log(`    [L3 #${l3idx}] ${l3.name}, m4=${l3.m4}`);
            console.log(`      - l3Functions:`, l3.l3Functions?.length || 0);
          });
        }
        
        if (l2.l2Functions) {
          l2.l2Functions.forEach((fn: any, fnIdx: number) => {
            console.log(`    [L2Function #${fnIdx}] productChar=${fn.productChar}, specialChar=${fn.specialChar}`);
          });
        }
      });
    }
  } else {
    const text = await pfmeaResponse.text().catch(() => 'error');
    console.log('응답:', text.substring(0, 500));
  }
});
