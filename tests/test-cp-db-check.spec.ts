/**
 * CP 데이터베이스 데이터 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('CP 데이터베이스 확인', async ({ page }) => {
  // API로 CP Items 조회
  console.log('🔍 CP Items API 조회...');
  
  const response = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/items');
  const data = await response.json();
  
  console.log('📊 API 응답 성공:', data.success);
  console.log('📊 데이터 개수:', data.data?.length || 0);
  
  if (data.data && data.data.length > 0) {
    // 첫 5개 아이템의 주요 필드 출력
    for (let i = 0; i < Math.min(5, data.data.length); i++) {
      const item = data.data[i];
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

  // Master 데이터도 확인
  console.log('\n🔍 CP Master 데이터 API 조회...');
  const masterResponse = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/master-data');
  const masterData = await masterResponse.json();
  
  console.log('📊 Master API 응답 성공:', masterData.success);
  
  if (masterData.success && masterData.data && masterData.data.items) {
    const items = masterData.data.items;
    console.log('📊 Master 데이터 개수:', items.length);
    
    // 설비/금형 데이터 (A5) 확인
    const equipmentItems = items.filter((item: any) => item.itemCode === 'A5');
    console.log(`\n📊 A5(설비/금형) 아이템 수: ${equipmentItems.length}`);
    equipmentItems.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`  A5 ${idx + 1}: processNo="${item.processNo}", value="${item.value}"`);
    });
    
    // 관리방법 데이터 (B7-1) 확인
    const controlMethodItems = items.filter((item: any) => item.itemCode === 'B7-1');
    console.log(`\n📊 B7-1(관리방법) 아이템 수: ${controlMethodItems.length}`);
    controlMethodItems.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`  B7-1 ${idx + 1}: processNo="${item.processNo}", value="${item.value}"`);
    });
    
    // 주기 데이터 (B7) 확인
    const freqItems = items.filter((item: any) => item.itemCode === 'B7');
    console.log(`\n📊 B7(주기) 아이템 수: ${freqItems.length}`);
    freqItems.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`  B7 ${idx + 1}: processNo="${item.processNo}", value="${item.value}"`);
    });
    
    // 책임1 데이터 (B8) 확인
    const owner1Items = items.filter((item: any) => item.itemCode === 'B8');
    console.log(`\n📊 B8(책임1) 아이템 수: ${owner1Items.length}`);
    owner1Items.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`  B8 ${idx + 1}: processNo="${item.processNo}", value="${item.value}"`);
    });
    
    // 책임2 데이터 (B9) 확인
    const owner2Items = items.filter((item: any) => item.itemCode === 'B9');
    console.log(`\n📊 B9(책임2) 아이템 수: ${owner2Items.length}`);
    owner2Items.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`  B9 ${idx + 1}: processNo="${item.processNo}", value="${item.value}"`);
    });
  }
  
  expect(data.success).toBe(true);
});
