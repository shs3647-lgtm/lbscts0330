/**
 * CP Master 데이터 상세 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('CP Master 데이터 상세 확인', async ({ page }) => {
  // Master 데이터 조회
  console.log('🔍 CP Master 데이터 API 조회...');
  const masterResponse = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/master-data');
  const masterData = await masterResponse.json();
  
  console.log('📊 Master API 응답 성공:', masterData.success);
  console.log('📊 Master API 전체 응답:', JSON.stringify(masterData, null, 2).substring(0, 2000));
  
  // flatData로 응답이 오는 경우 처리
  if (masterData.success && (masterData.data || masterData.flatData)) {
    const items = masterData.flatData || (masterData.data?.items) || [];
    console.log('📊 전체 아이템 수:', items.length);
    
    // 카테고리별 아이템 수
    const categories: Record<string, number> = {};
    items.forEach((item: any) => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });
    console.log('📊 카테고리별 아이템 수:', categories);
    
    // itemCode별 아이템 수
    const itemCodes: Record<string, number> = {};
    items.forEach((item: any) => {
      itemCodes[item.itemCode] = (itemCodes[item.itemCode] || 0) + 1;
    });
    console.log('📊 itemCode별 아이템 수:', itemCodes);
    
    // A5 (설비/금형) 데이터 상세
    console.log('\n=== A5 (설비/금형/지그) 데이터 ===');
    const a5Items = items.filter((item: any) => item.itemCode === 'A5');
    console.log(`총 ${a5Items.length}개`);
    a5Items.forEach((item: any) => {
      console.log(`  processNo: "${item.processNo}", value: "${item.value}", category: "${item.category}"`);
    });
    
    // B7-1 (관리방법) 데이터 상세
    console.log('\n=== B7-1 (관리방법) 데이터 ===');
    const b71Items = items.filter((item: any) => item.itemCode === 'B7-1');
    console.log(`총 ${b71Items.length}개`);
    b71Items.forEach((item: any) => {
      console.log(`  processNo: "${item.processNo}", value: "${item.value}", category: "${item.category}"`);
    });
    
    // processInfo 카테고리의 모든 데이터
    console.log('\n=== processInfo 카테고리 전체 (설비/금형 포함) ===');
    const processInfoItems = items.filter((item: any) => item.category === 'processInfo');
    console.log(`총 ${processInfoItems.length}개`);
    processInfoItems.slice(0, 20).forEach((item: any) => {
      console.log(`  itemCode: "${item.itemCode}", processNo: "${item.processNo}", value: "${item.value}"`);
    });
    
    // controlMethod 카테고리의 모든 데이터
    console.log('\n=== controlMethod 카테고리 전체 (관리방법 포함) ===');
    const controlMethodItems = items.filter((item: any) => item.category === 'controlMethod');
    console.log(`총 ${controlMethodItems.length}개`);
    controlMethodItems.slice(0, 20).forEach((item: any) => {
      console.log(`  itemCode: "${item.itemCode}", processNo: "${item.processNo}", value: "${item.value}"`);
    });
  } else {
    console.log('❌ Master 데이터 없음');
  }
  
  expect(masterData.success).toBe(true);
});
