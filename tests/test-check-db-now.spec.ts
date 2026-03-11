/**
 * DB 현재 상태 확인
 */
import { test, expect } from '@playwright/test';

test('DB 현재 상태 확인', async ({ page }) => {
  // Items API 호출
  const itemsResponse = await page.request.get('http://localhost:3001/api/control-plan/cp26-m001/items');
  const itemsData = await itemsResponse.json();
  
  console.log('📊 총 아이템 수:', itemsData.data?.length || 0);
  
  if (itemsData.success && itemsData.data) {
    for (let i = 0; i < Math.min(5, itemsData.data.length); i++) {
      const item = itemsData.data[i];
      console.log(`\n--- 공정 ${item.processNo} (${item.processName}) ---`);
      console.log(`  E열(workElement): "${item.workElement}"`);
      console.log(`  P열(controlMethod): "${item.controlMethod}"`);
      console.log(`  O열(sampleFreq): "${item.sampleFreq}"`);
      console.log(`  Q열(owner1): "${item.owner1}"`);
      console.log(`  R열(owner2): "${item.owner2}"`);
    }
  }
  
  expect(itemsData.success).toBe(true);
});
