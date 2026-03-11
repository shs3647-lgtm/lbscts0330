/**
 * DB 데이터 직접 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('FMEA L2Structure 확인', async ({ page }) => {
  // Prisma를 통해 직접 확인할 수 없으므로 API로 확인
  
  // 1. FMEA 구조 API 확인 - L2 조회
  const response = await page.request.get('http://localhost:3000/api/sync/structure?fmeaId=PFM26-M001&action=checkL2');
  console.log('L2 확인 응답:', await response.text());
});

test('ControlPlanItem 확인', async ({ page }) => {
  // 1. CP 목록에서 cp26-m001의 ID 확인
  const listResponse = await page.request.get('http://localhost:3000/api/control-plan');
  const listData = await listResponse.json();
  console.log('CP 목록:', JSON.stringify(listData.data?.slice(0, 3), null, 2));
  
  // cp26-m001 찾기
  const targetCp = listData.data?.find((cp: any) => cp.cpNo === 'cp26-m001');
  if (targetCp) {
    console.log('\n대상 CP ID:', targetCp.id);
    console.log('프로세스 개수:', targetCp._count?.processes);
    
    // 2. CP Items API - cpNo로 조회 시도
    const itemsResponse = await page.request.get(`http://localhost:3000/api/control-plan/${targetCp.cpNo}/items`);
    const itemsStatus = itemsResponse.status();
    console.log('\nCP Items API 상태:', itemsStatus);
    
    if (itemsStatus === 200) {
      const itemsData = await itemsResponse.json();
      console.log('CP Items:', JSON.stringify(itemsData, null, 2).substring(0, 1000));
    } else {
      console.log('CP Items 응답:', await itemsResponse.text().catch(() => 'error'));
    }
  }
});

test('CP 워크시트 API 확인', async ({ page }) => {
  // CP 워크시트는 어떤 API를 사용하는지 확인
  await page.goto('http://localhost:3000/control-plan/worksheet?id=cp26-m001');
  
  // 네트워크 요청 모니터링
  const requests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      requests.push(`${req.method()} ${req.url()}`);
    }
  });
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('API 요청들:', requests);
  
  await page.screenshot({ path: 'test-results/cp-worksheet-debug.png', fullPage: true });
});

test('CP 프로세스 API 확인', async ({ page }) => {
  // CP 프로세스 API 직접 호출
  const response = await page.request.get('http://localhost:3000/api/control-plan/process?cpNo=cp26-m001');
  const status = response.status();
  console.log('CP 프로세스 API 상태:', status);
  
  if (status === 200) {
    const data = await response.json();
    console.log('CP 프로세스:', JSON.stringify(data, null, 2).substring(0, 2000));
  } else {
    const text = await response.text().catch(() => 'error');
    console.log('응답:', text.substring(0, 500));
  }
});
