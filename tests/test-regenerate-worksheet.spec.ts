/**
 * CP 워크시트 재생성 테스트 - master-to-worksheet API 호출
 */
import { test, expect } from '@playwright/test';

test('CP 워크시트 재생성', async ({ page }) => {
  // 콘솔 로그 모니터링
  page.on('console', msg => {
    console.log(`[Browser] ${msg.text()}`);
  });

  // 1. Master 데이터 가져오기
  console.log('🔍 Master 데이터 가져오기...');
  const masterResponse = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/master-data');
  const masterData = await masterResponse.json();
  
  if (!masterData.success || !masterData.flatData) {
    console.log('❌ Master 데이터 없음');
    return;
  }
  
  console.log('📊 Master flatData 개수:', masterData.flatData.length);

  // 2. master-to-worksheet API 호출
  console.log('🔄 master-to-worksheet API 호출...');
  
  const response = await page.request.post('http://localhost:3001/api/control-plan/master-to-worksheet', {
    data: {
      cpNo: 'cp26-m001',
      flatData: masterData.flatData
    }
  });
  
  const result = await response.json();
  console.log('📊 API 응답:', JSON.stringify(result, null, 2).substring(0, 3000));
  
  if (result.success) {
    console.log('✅ 워크시트 재생성 성공!');
    console.log('📊 처리 결과:', result.counts);
  } else {
    console.log('❌ 워크시트 재생성 실패:', result.error);
  }
  
  // 재생성된 데이터 확인
  console.log('\n🔍 재생성된 ControlPlanItem 확인...');
  const itemsResponse = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/items');
  const itemsData = await itemsResponse.json();
  
  if (itemsData.success && itemsData.data) {
    console.log('📊 총 아이템 수:', itemsData.data.length);
    
    // 첫 5개 아이템의 주요 필드 출력
    for (let i = 0; i < Math.min(5, itemsData.data.length); i++) {
      const item = itemsData.data[i];
      console.log(`\n--- 아이템 ${i + 1} ---`);
      console.log(`공정번호: ${item.processNo}`);
      console.log(`공정명: ${item.processName}`);
      console.log(`E열(workElement/설비): "${item.workElement}"`);
      console.log(`O열(sampleFreq/주기): "${item.sampleFreq}"`);
      console.log(`P열(controlMethod/관리방법): "${item.controlMethod}"`);
      console.log(`Q열(owner1/책임1): "${item.owner1}"`);
      console.log(`R열(owner2/책임2): "${item.owner2}"`);
    }
  }
  
  expect(result.success).toBe(true);
});
