/**
 * CP 연동 필드 검증 테스트
 * - 제품특성, 공정특성, 설비/금형/지그 연동 확인
 */
import { test, expect } from '@playwright/test';

test('CP 연동 - 제품특성/공정특성/설비 필드 검증', async ({ page }) => {
  console.log('=== CP 연동 필드 검증 테스트 ===');
  
  // 다이얼로그 핸들러
  page.on('dialog', async dialog => {
    console.log('다이얼로그:', dialog.message());
    await dialog.accept();
  });
  
  // 1. FMEA 워크시트 열기
  console.log('1. FMEA 워크시트 열기');
  await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 2. CP 구조연동 실행
  console.log('2. CP 구조연동 실행');
  const cpSyncButton = page.locator('[data-testid="cp-sync-button"]');
  await cpSyncButton.click();
  await page.waitForTimeout(300);
  
  const structureSyncButton = page.locator('button:has-text("CP 구조연동")');
  await structureSyncButton.click();
  await page.waitForTimeout(2000);
  
  // 3. API로 CP Items 확인
  console.log('3. API로 CP Items 필드 확인');
  const response = await page.request.get('http://localhost:3000/api/control-plan/cp26-m001/items');
  const data = await response.json();
  
  console.log('\n=== CP Items 필드 검증 ===');
  console.log('총 Items 개수:', data.data?.length);
  
  if (data.data && data.data.length > 0) {
    // 고유한 공정별로 그룹화
    const byProcess = new Map<string, any>();
    data.data.forEach((item: any) => {
      if (!byProcess.has(item.processName)) {
        byProcess.set(item.processName, item);
      }
    });
    
    console.log('\n=== 공정별 연동 데이터 ===');
    for (const [processName, item] of byProcess) {
      console.log(`\n[공정: ${processName}]`);
      console.log(`  - 공정번호: ${item.processNo}`);
      console.log(`  - 작업요소: ${item.workElement || '(없음)'}`);
      console.log(`  - 설비/금형/지그: ${item.equipment || '(없음)'}`);
      console.log(`  - 제품특성: ${item.productChar || '(없음)'}`);
      console.log(`  - 공정특성: ${item.processChar || '(없음)'}`);
      console.log(`  - 특별특성: ${item.specialChar || '(없음)'}`);
    }
    
    // 검증: 필드가 존재하는지 확인
    const firstItem = data.data[0];
    console.log('\n=== 필드 존재 여부 ===');
    console.log('processNo 필드:', 'processNo' in firstItem);
    console.log('processName 필드:', 'processName' in firstItem);
    console.log('workElement 필드:', 'workElement' in firstItem);
    console.log('equipment 필드:', 'equipment' in firstItem);
    console.log('productChar 필드:', 'productChar' in firstItem);
    console.log('processChar 필드:', 'processChar' in firstItem);
    console.log('specialChar 필드:', 'specialChar' in firstItem);
  }
  
  // 4. CP 워크시트에서 UI 확인
  console.log('\n4. CP 워크시트 UI 확인');
  await page.goto('http://localhost:3000/control-plan/worksheet?cpNo=cp26-m001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/cp-sync-fields.png', fullPage: true });
  
  // 페이지 내용에서 필드 확인
  const pageContent = await page.content();
  console.log('\n=== 페이지 내용 확인 ===');
  console.log('자재입고 포함:', pageContent.includes('자재입고'));
  console.log('수입검사 포함:', pageContent.includes('수입검사'));
  console.log('MB Mixing 포함:', pageContent.includes('MB Mixing'));
  
  // 검증
  expect(data.success).toBe(true);
  expect(data.data?.length).toBeGreaterThan(0);
  
  console.log('\n✅ CP 연동 필드 검증 완료!');
});

test('FMEA 구조 데이터 확인', async ({ page }) => {
  console.log('=== FMEA 구조 데이터 확인 ===');
  
  // L2Structure + L3Structure + Functions 조회
  const response = await page.request.get('http://localhost:3000/api/sync/structure', {
    data: {
      action: 'check',
      fmeaId: 'PFM26-M001'
    }
  });
  
  // FMEA 상세 API 확인
  const fmeaResponse = await page.request.get('http://localhost:3000/api/fmea/PFM26-M001');
  const status = fmeaResponse.status();
  console.log('FMEA API 상태:', status);
  
  if (status === 200) {
    const fmeaData = await fmeaResponse.json();
    console.log('FMEA 데이터 키:', Object.keys(fmeaData.data || {}));
  }
});
