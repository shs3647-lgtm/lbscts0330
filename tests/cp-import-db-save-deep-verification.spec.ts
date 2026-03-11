import { test, expect } from '@playwright/test';

/**
 * CP Import DB 저장 깊이 있는 검증 테스트
 * 
 * 검증 항목:
 * 1. CP Import 페이지에서 실제 데이터 파싱 확인
 * 2. Save All 버튼 클릭 시 API 호출 확인
 * 3. master-to-worksheet API 요청/응답 확인
 * 4. DB에 실제 저장 여부 확인
 * 5. 에러 발생 시 상세 로그 확인
 */

test.describe('CP Import DB Save Deep Verification', () => {
  const BASE_URL = 'http://localhost:3000';
  const CP_ID = 'cp26-m001';
  const IMPORT_URL = `${BASE_URL}/control-plan/import?id=${CP_ID}`;
  const DB_VIEWER_URL = `${BASE_URL}/admin/db-viewer`;

  test.beforeEach(async ({ page }) => {
    // 네트워크 요청/응답 추적
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/control-plan')) {
        console.log(`📤 [API Request] ${request.method()} ${url}`);
        if (request.postData()) {
          try {
            const body = JSON.parse(request.postData() || '{}');
            console.log(`   Body:`, {
              cpNo: body.cpNo,
              flatDataCount: body.flatData?.length || 0,
              flatDataSample: body.flatData?.slice(0, 3) || [],
            });
          } catch (e) {
            console.log(`   Body (raw):`, request.postData()?.substring(0, 200));
          }
        }
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/control-plan')) {
        console.log(`📥 [API Response] ${response.status()} ${url}`);
        response.json().then((data) => {
          console.log(`   Response:`, {
            ok: data.ok,
            error: data.error,
            counts: data.counts,
            message: data.message,
          });
        }).catch(() => {
          // JSON 파싱 실패 시 무시
        });
      }
    });

    // 콘솔 로그 추적
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[CP Import]') || text.includes('[CP Master→Worksheet]')) {
        console.log(`[Browser Console] ${msg.type()}: ${text}`);
      }
    });
  });

  test('CP Import 저장 전체 플로우 검증', async ({ page }) => {
    console.log('🔍 Step 1: CP Import 페이지 접속');
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 페이지 로드 확인
    const pageTitle = page.locator('h1, h2').filter({ hasText: /기초정보|Import|CP/i }).first();
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    console.log('🔍 Step 2: 현재 데이터 상태 확인');
    
    // localStorage에서 데이터 확인
    const localStorageData = await page.evaluate(() => {
      const cpMasterData = localStorage.getItem('cp_master_data');
      return cpMasterData ? JSON.parse(cpMasterData) : null;
    });
    
    console.log('📦 localStorage 데이터:', {
      exists: !!localStorageData,
      count: localStorageData?.length || 0,
      sample: localStorageData?.slice(0, 5) || [],
      categories: localStorageData ? [...new Set(localStorageData.map((d: any) => d.category))] : [],
      itemCodes: localStorageData ? [...new Set(localStorageData.map((d: any) => d.itemCode))] : [],
    });

    // Save All 버튼 상태 확인
    const saveAllButton = page.locator('button').filter({ hasText: /전체저장|Save All/i }).first();
    const isEnabled = await saveAllButton.isEnabled().catch(() => false);
    const buttonText = await saveAllButton.textContent().catch(() => '');
    
    console.log('💾 Save All 버튼 상태:', {
      exists: await saveAllButton.isVisible().catch(() => false),
      enabled: isEnabled,
      text: buttonText,
    });

    if (!isEnabled) {
      console.log('⚠️ Save All 버튼이 disabled 상태입니다. 데이터가 없거나 이미 저장되었을 수 있습니다.');
      console.log('   → DB 뷰어에서 기존 데이터를 확인합니다.');
    } else {
      console.log('🔍 Step 3: Save All 버튼 클릭 및 API 호출 확인');
      
      // API 호출 대기
      const apiCallPromise = page.waitForResponse(
        (response) => response.url().includes('/api/control-plan/master-to-worksheet'),
        { timeout: 30000 }
      ).catch(() => null);

      // Save All 버튼 클릭
      await saveAllButton.click();
      await page.waitForTimeout(2000);

      // API 응답 대기
      const apiResponse = await apiCallPromise;
      
      if (apiResponse) {
        console.log('✅ API 호출 확인:', {
          status: apiResponse.status(),
          url: apiResponse.url(),
        });

        const responseBody = await apiResponse.json().catch(() => ({}));
        console.log('📥 API 응답 본문:', {
          ok: responseBody.ok,
          error: responseBody.error,
          counts: responseBody.counts,
          message: responseBody.message,
        });

        // API 성공 여부 확인
        if (apiResponse.status() === 200 && responseBody.ok) {
          console.log('✅ API 호출 성공');
        } else {
          console.error('❌ API 호출 실패:', {
            status: apiResponse.status(),
            error: responseBody.error,
          });
        }
      } else {
        console.error('❌ API 호출이 감지되지 않았습니다.');
      }

      // 저장 완료 메시지 확인
      await page.waitForTimeout(3000);
      const savedMessage = page.locator('text=/저장|완료|saved|success/i').first();
      const hasMessage = await savedMessage.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasMessage) {
        const messageText = await savedMessage.textContent();
        console.log('✅ 저장 완료 메시지:', messageText);
      }
    }

    console.log('🔍 Step 4: DB 뷰어에서 실제 저장 여부 확인');
    
    // DB 뷰어로 이동
    await page.goto(DB_VIEWER_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 프로젝트 선택
    const projectInput = page.locator('input[placeholder*="프로젝트"], input[value*="cp"]').first();
    if (await projectInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectInput.clear();
      await projectInput.fill(CP_ID);
      await projectInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    // CP 테이블들 확인
    const cpTables = [
      { name: 'CP 공정현황', table: 'cp_processes' },
      { name: 'CP 검출장치', table: 'cp_detectors' },
      { name: 'CP 관리항목', table: 'cp_control_items' },
      { name: 'CP 관리방법', table: 'cp_control_methods' },
      { name: 'CP 대응계획', table: 'cp_reaction_plans' },
    ];

    for (const tableInfo of cpTables) {
      console.log(`🔍 ${tableInfo.name} 테이블 확인`);
      
      // 테이블 선택
      const tableRow = page.locator(`tr`).filter({ hasText: tableInfo.name }).first();
      if (await tableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tableRow.click();
        await page.waitForTimeout(2000);

        // 테이블 데이터 확인
        const tableData = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr').first();
        const hasData = await tableData.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasData) {
          const rows = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr');
          const rowCount = await rows.count();
          
          console.log(`   ✅ ${tableInfo.name}: ${rowCount}개 행 발견`);
          
          // 첫 번째 행 데이터 확인
          if (rowCount > 0) {
            const firstRow = rows.first();
            const rowText = await firstRow.textContent();
            console.log(`   첫 번째 행: ${rowText?.substring(0, 150)}`);
          }
        } else {
          console.log(`   ❌ ${tableInfo.name}: 데이터 없음`);
        }
      } else {
        console.log(`   ⚠️ ${tableInfo.name} 테이블 행을 찾을 수 없습니다.`);
      }
    }
  });

  test('API 직접 호출 검증', async ({ page }) => {
    console.log('🔍 API 직접 호출 검증 시작');
    
    // CP Import 페이지에서 localStorage 데이터 가져오기
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const flatData = await page.evaluate(() => {
      const cpMasterData = localStorage.getItem('cp_master_data');
      return cpMasterData ? JSON.parse(cpMasterData) : [];
    });

    console.log('📦 localStorage에서 가져온 데이터:', {
      count: flatData.length,
      sample: flatData.slice(0, 5),
      categories: [...new Set(flatData.map((d: any) => d.category))],
      itemCodes: [...new Set(flatData.map((d: any) => d.itemCode))],
    });

    if (flatData.length === 0) {
      console.log('⚠️ localStorage에 데이터가 없습니다. Import를 먼저 실행해주세요.');
      return;
    }

    // API 직접 호출
    console.log('📤 API 직접 호출:', {
      cpNo: CP_ID,
      flatDataCount: flatData.length,
    });

    const apiResponse = await page.evaluate(async (cpNo: string, data: Array<{processNo: string; category: string; itemCode: string; value: string}>) => {
      const response = await fetch('/api/control-plan/master-to-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpNo: cpNo.trim(),
          flatData: data
            .filter((d) => d.processNo && d.processNo.trim() && d.itemCode && d.itemCode.trim())
            .map((d) => ({
              processNo: d.processNo.trim(),
              category: d.category,
              itemCode: d.itemCode.trim(),
              value: (d.value || '').trim(),
            })),
        }),
      });

      return {
        status: response.status,
        ok: response.ok,
        body: await response.json(),
      };
    }, CP_ID, flatData) as { status: number; ok: boolean; body: any };

    console.log('📥 API 응답:', {
      status: apiResponse.status,
      ok: apiResponse.ok,
      body: apiResponse.body,
    });

    // 응답 검증
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.body.ok).toBe(true);

    // DB 뷰어에서 확인
    await page.goto(DB_VIEWER_URL, { waitUntil: 'networkidle' });
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
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});




