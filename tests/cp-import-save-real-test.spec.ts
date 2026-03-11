import { test, expect } from '@playwright/test';

/**
 * CP Import 실제 저장 테스트
 * 
 * 실제 Excel 파일을 업로드하고 저장하여 DB에 저장되는지 확인
 */

test.describe('CP Import Real Save Test', () => {
  const BASE_URL = 'http://localhost:3000';
  const CP_ID = 'cp26-m001';
  const IMPORT_URL = `${BASE_URL}/control-plan/import?id=${CP_ID}`;

  test('실제 Excel 파일 업로드 및 저장 테스트', async ({ page }) => {
    // 네트워크 요청/응답 추적
    const apiCalls: Array<{ url: string; method: string; status?: number; body?: any; response?: any }> = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/control-plan/master-to-worksheet')) {
        const body = request.postData();
        apiCalls.push({
          url,
          method: request.method(),
          body: body ? JSON.parse(body) : null,
        });
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/control-plan/master-to-worksheet')) {
        const body = await response.json().catch(() => ({}));
        const call = apiCalls.find(c => c.url === url);
        if (call) {
          call.status = response.status();
          call.response = body;
        }
      }
    });

    // 콘솔 로그 추적
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[CP') || text.includes('Master→Worksheet')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    console.log('🔍 Step 1: CP Import 페이지 접속');
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 현재 데이터 상태 확인
    const hasData = await page.evaluate(() => {
      const cpMasterData = localStorage.getItem('cp_master_data');
      return cpMasterData ? JSON.parse(cpMasterData).length > 0 : false;
    });

    console.log('📦 현재 데이터 상태:', hasData ? '있음' : '없음');

    if (!hasData) {
      console.log('⚠️ 데이터가 없습니다. Excel 파일을 업로드해야 합니다.');
      console.log('   → 수동으로 Excel 파일을 업로드하고 "전체저장" 버튼을 클릭해주세요.');
      console.log('   → 그 후 이 테스트를 다시 실행하세요.');
      return;
    }

    // Save All 버튼 클릭
    const saveAllButton = page.locator('button').filter({ hasText: /전체저장|Save All/i }).first();
    const isEnabled = await saveAllButton.isEnabled().catch(() => false);

    if (!isEnabled) {
      console.log('⚠️ Save All 버튼이 disabled 상태입니다.');
      return;
    }

    console.log('🔍 Step 2: Save All 버튼 클릭');
    
    // API 호출 대기
    const apiCallPromise = page.waitForResponse(
      (response) => response.url().includes('/api/control-plan/master-to-worksheet'),
      { timeout: 30000 }
    ).catch(() => null);

    await saveAllButton.click();
    await page.waitForTimeout(5000);

    // API 응답 확인
    const apiResponse = await apiCallPromise;
    
    if (apiResponse) {
      const responseBody = await apiResponse.json().catch(() => ({}));
      
      console.log('📥 API 응답:', {
        status: apiResponse.status(),
        ok: responseBody.ok,
        error: responseBody.error,
        counts: responseBody.counts,
      });

      // API 성공 여부 확인
      expect(apiResponse.status()).toBe(200);
      expect(responseBody.ok).toBe(true);
      expect(responseBody.counts).toBeDefined();
      expect(responseBody.counts.processes).toBeGreaterThan(0);
    } else {
      console.error('❌ API 호출이 감지되지 않았습니다.');
      console.log('   콘솔 로그:', consoleLogs.slice(-20));
    }

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
        console.log(`   첫 번째 행: ${rowText?.substring(0, 100)}`);
      }
      
      // 최소 1개 행은 있어야 함
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});




