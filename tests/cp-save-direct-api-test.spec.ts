import { test, expect } from '@playwright/test';

/**
 * CP 저장 직접 API 테스트
 * 
 * localStorage에 데이터가 있는 경우 직접 API를 호출하여 저장 테스트
 */

test.describe('CP Save Direct API Test', () => {
  const BASE_URL = 'http://localhost:3000';
  const CP_ID = 'cp26-m001';
  const IMPORT_URL = `${BASE_URL}/control-plan/import?id=${CP_ID}`;

  test('localStorage 데이터로 직접 API 호출 테스트', async ({ page }) => {
    console.log('🔍 Step 1: CP Import 페이지 접속');
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // localStorage에서 데이터 가져오기
    const flatData = await page.evaluate(() => {
      const cpMasterData = localStorage.getItem('cp_master_data');
      return cpMasterData ? JSON.parse(cpMasterData) : [];
    });

    console.log('📦 localStorage 데이터:', {
      count: flatData.length,
      sample: flatData.slice(0, 5),
      categories: [...new Set(flatData.map((d: any) => d.category))],
      itemCodes: [...new Set(flatData.map((d: any) => d.itemCode))],
      processNos: [...new Set(flatData.map((d: any) => d.processNo).filter((p: any) => p))].slice(0, 10),
    });

    if (flatData.length === 0) {
      console.log('⚠️ localStorage에 데이터가 없습니다.');
      console.log('   → CP Import 페이지에서 Excel 파일을 업로드하고 "전체저장" 버튼을 클릭해주세요.');
      return;
    }

    // API 직접 호출
    console.log('📤 Step 2: API 직접 호출');
    
    const apiResponse = await page.evaluate(async (cpNo, data) => {
      try {
        const response = await fetch('/api/control-plan/master-to-worksheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpNo: cpNo.trim(),
            flatData: data
              .filter((d: any) => d.processNo && d.processNo.trim() && d.itemCode && d.itemCode.trim())
              .map((d: any) => ({
                processNo: d.processNo.trim(),
                category: d.category,
                itemCode: d.itemCode.trim(),
                value: (d.value || '').trim(),
              })),
          }),
        });
        
        const body = await response.json();
        
        return {
          status: response.status,
          ok: response.ok,
          body,
        };
      } catch (error: any) {
        return {
          status: 0,
          ok: false,
          error: error.message,
        };
      }
    }, CP_ID, flatData);

    console.log('📥 API 응답:', {
      status: apiResponse.status,
      ok: apiResponse.ok,
      body: apiResponse.body,
    });

    // 응답 검증
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.ok).toBe(true);
    expect(apiResponse.body.ok).toBe(true);
    expect(apiResponse.body.counts).toBeDefined();
    expect(apiResponse.body.counts.processes).toBeGreaterThan(0);

    console.log('✅ API 호출 성공:', {
      processes: apiResponse.body.counts.processes,
      detectors: apiResponse.body.counts.detectors,
      controlItems: apiResponse.body.counts.controlItems,
      controlMethods: apiResponse.body.counts.controlMethods,
      reactionPlans: apiResponse.body.counts.reactionPlans,
    });

    // DB 뷰어에서 확인
    console.log('🔍 Step 3: DB 뷰어에서 확인');
    await page.goto(`${BASE_URL}/admin/db-viewer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 프로젝트 선택
    const projectInput = page.locator('input[placeholder*="프로젝트"], input[value*="cp"]').first();
    if (await projectInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectInput.clear();
      await projectInput.fill(CP_ID);
      await projectInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    // CP 공정현황 테이블 확인
    const tableRow = page.locator(`tr`).filter({ hasText: 'CP 공정현황' }).first();
    if (await tableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tableRow.click();
      await page.waitForTimeout(2000);

      const rows = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr');
      const rowCount = await rows.count();
      
      console.log(`✅ CP 공정현황: ${rowCount}개 행`);
      
      if (rowCount > 0) {
        const firstRow = rows.first();
        const rowText = await firstRow.textContent();
        console.log(`   첫 번째 행: ${rowText?.substring(0, 150)}`);
      }
      
      // 최소 1개 행은 있어야 함
      expect(rowCount).toBeGreaterThan(0);
    } else {
      console.log('⚠️ CP 공정현황 테이블 행을 찾을 수 없습니다.');
    }
  });
});




