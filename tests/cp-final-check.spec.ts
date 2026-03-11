/**
 * CP 연동 최종 검증 테스트
 */
import { test, expect } from '@playwright/test';

test.describe('CP 연동 최종 검증', () => {
  
  test('1. FMEA에서 CP 구조연동', async ({ page }) => {
    console.log('=== 1단계: FMEA에서 CP 구조연동 ===');
    
    // FMEA 워크시트 열기
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 다이얼로그 핸들러
    page.on('dialog', async dialog => {
      console.log('다이얼로그:', dialog.message());
      await dialog.accept();
    });
    
    // CP 연동 버튼 클릭
    const cpSyncButton = page.locator('[data-testid="cp-sync-button"]');
    await cpSyncButton.click();
    await page.waitForTimeout(500);
    
    // CP 구조연동 클릭
    const structureSyncButton = page.locator('button:has-text("CP 구조연동")');
    await structureSyncButton.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/final-01-sync-complete.png', fullPage: true });
  });

  test('2. CP 워크시트에서 데이터 확인 (올바른 URL)', async ({ page }) => {
    console.log('=== 2단계: CP 워크시트 확인 (cpNo 파라미터 사용) ===');
    
    // 올바른 URL: ?cpNo=cp26-m001 (id 아님!)
    await page.goto('http://localhost:3000/control-plan/worksheet?cpNo=cp26-m001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/final-02-cp-worksheet.png', fullPage: true });
    
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
      for (let j = 0; j < Math.min(cellCount, 6); j++) {
        const text = await cells.nth(j).textContent();
        cellTexts.push(text?.trim() || '');
      }
      console.log(`행 ${i}:`, cellTexts.join(' | '));
    }
    
    // "자재입고" 텍스트 확인 (FMEA에서 동기화된 공정명)
    const processName = page.locator('td:has-text("자재입고")');
    const exists = await processName.count();
    console.log('"자재입고" 존재 여부:', exists > 0);
  });

  test('3. CP Items API 직접 확인', async ({ page }) => {
    console.log('=== 3단계: CP Items API 직접 확인 ===');
    
    // API 직접 호출
    const response = await page.request.get('http://localhost:3000/api/control-plan/cp26-m001/items');
    const data = await response.json();
    
    console.log('API 응답 상태:', response.status());
    console.log('Items 개수:', data.data?.length || 0);
    
    if (data.data) {
      data.data.forEach((item: any, idx: number) => {
        console.log(`[${idx}] 공정: ${item.processName}, sortOrder: ${item.sortOrder}`);
      });
    }
    
    expect(data.success).toBe(true);
    expect(data.data?.length).toBeGreaterThan(0);
  });

  test('4. 전체 플로우 테스트', async ({ page }) => {
    console.log('=== 4단계: 전체 플로우 ===');
    
    // 다이얼로그 핸들러
    page.on('dialog', async dialog => {
      console.log('다이얼로그:', dialog.message());
      await dialog.accept();
    });
    
    // 1. FMEA 열기
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM26-M001&tab=all');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 2. CP 구조연동
    const cpSyncButton = page.locator('[data-testid="cp-sync-button"]');
    await cpSyncButton.click();
    await page.waitForTimeout(300);
    const structureSyncButton = page.locator('button:has-text("CP 구조연동")');
    await structureSyncButton.click();
    await page.waitForTimeout(2000);
    
    // 3. CP 워크시트로 이동 (올바른 URL)
    await page.goto('http://localhost:3000/control-plan/worksheet?cpNo=cp26-m001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/final-03-full-flow.png', fullPage: true });
    
    // 4. "자재입고" 확인
    const processName = page.locator('td:has-text("자재입고")');
    const exists = await processName.count();
    console.log('최종 확인 - "자재입고" 존재:', exists > 0);
    
    // 5. "수입검사" 확인
    const processName2 = page.locator('td:has-text("수입검사")');
    const exists2 = await processName2.count();
    console.log('최종 확인 - "수입검사" 존재:', exists2 > 0);
    
    expect(exists).toBeGreaterThan(0);
  });
});
