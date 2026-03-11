import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * CP Import 전체 플로우 검증 테스트
 * 
 * 1. CP Import 페이지 접속
 * 2. Excel 파일 업로드 (또는 기존 데이터 확인)
 * 3. "전체저장" 버튼 클릭
 * 4. API 호출 및 응답 확인
 * 5. DB 뷰어에서 실제 데이터 확인
 */

test.describe('CP Import Full Flow Verification', () => {
  const BASE_URL = 'http://localhost:3000';
  const CP_ID = 'cp26-m001';
  const IMPORT_URL = `${BASE_URL}/control-plan/import?id=${CP_ID}`;
  const DB_VIEWER_URL = `${BASE_URL}/admin/db-viewer`;

  test('CP Import 전체 플로우 검증', async ({ page }) => {
    // 네트워크 요청/응답 추적
    const apiCalls: Array<{ url: string; method: string; status?: number; requestBody?: any; responseBody?: any }> = [];
    
    page.on('request', async (request) => {
      const url = request.url();
      if (url.includes('/api/control-plan/master-to-worksheet')) {
        const body = request.postData();
        apiCalls.push({
          url,
          method: request.method(),
          requestBody: body ? JSON.parse(body) : null,
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
          call.responseBody = body;
        }
      }
    });

    // 콘솔 로그 추적
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[CP') || text.includes('Master→Worksheet') || text.includes('Import')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    console.log('🔍 Step 1: CP Import 페이지 접속');
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 페이지 로드 확인
    const pageTitle = page.locator('h1, h2, h3').filter({ hasText: /기초정보|Import|CP/i }).first();
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    console.log('🔍 Step 2: 현재 데이터 상태 확인');
    
    // localStorage에서 데이터 확인
    const localStorageData = await page.evaluate(() => {
      const cpMasterData = localStorage.getItem('cp_master_data');
      return cpMasterData ? JSON.parse(cpMasterData) : [];
    });
    
    console.log('📦 localStorage 데이터:', {
      exists: localStorageData.length > 0,
      count: localStorageData.length,
      sample: localStorageData.slice(0, 5),
      categories: localStorageData.length > 0 ? [...new Set(localStorageData.map((d: any) => d.category))] : [],
      itemCodes: localStorageData.length > 0 ? [...new Set(localStorageData.map((d: any) => d.itemCode))] : [],
      processNos: localStorageData.length > 0 ? [...new Set(localStorageData.map((d: any) => d.processNo).filter((p: any) => p))].slice(0, 10) : [],
    });

    // Save All 버튼 확인
    const saveAllButton = page.locator('button').filter({ hasText: /전체저장|Save All/i }).first();
    const isEnabled = await saveAllButton.isEnabled().catch(() => false);
    const buttonText = await saveAllButton.textContent().catch(() => '');
    
    console.log('💾 Save All 버튼 상태:', {
      exists: await saveAllButton.isVisible().catch(() => false),
      enabled: isEnabled,
      text: buttonText,
    });

    if (!isEnabled) {
      console.log('⚠️ Save All 버튼이 disabled 상태입니다.');
      console.log('   → Excel 파일을 업로드해야 합니다.');
      console.log('   → 또는 이미 저장된 데이터가 있을 수 있습니다.');
      
      // 기존 데이터로 API 직접 호출 시도
      if (localStorageData.length > 0) {
        console.log('🔍 Step 3: localStorage 데이터로 API 직접 호출');
        
        const apiResponse = await page.evaluate(async (cpNo: string, data: Array<{processNo: string; category: string; itemCode: string; value: string}>) => {
          try {
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
        }, CP_ID, localStorageData) as { status: number; ok: boolean; body?: any; error?: string };

        console.log('📥 API 직접 호출 응답:', {
          status: apiResponse.status,
          ok: apiResponse.ok,
          body: apiResponse.body,
        });

        if (apiResponse.status === 200 && apiResponse.ok && apiResponse.body.ok) {
          console.log('✅ API 호출 성공:', apiResponse.body.counts);
        } else {
          console.error('❌ API 호출 실패:', apiResponse.body.error);
        }
      }
    } else {
      console.log('🔍 Step 3: Save All 버튼 클릭');
      
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
        
        if (responseBody.counts && responseBody.counts.processes > 0) {
          console.log('✅ API 호출 성공:', responseBody.counts);
        } else {
          console.error('❌ API 호출은 성공했지만 데이터가 저장되지 않았습니다:', responseBody);
        }
      } else {
        console.error('❌ API 호출이 감지되지 않았습니다.');
        console.log('   콘솔 로그:', consoleLogs.slice(-20));
      }
    }

    // DB 뷰어에서 확인
    console.log('🔍 Step 4: DB 뷰어에서 실제 데이터 확인');
    await page.goto(DB_VIEWER_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // CP 탭 선택 시도
    const cpTab = page.locator('button').filter({ hasText: /^CP$/ }).first();
    if (await cpTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cpTab.click();
      await page.waitForTimeout(2000);
    }

    // 프로젝트 선택 모달 열기
    const projectButton = page.locator('button').filter({ hasText: /프로젝트|전체 \(필터 없음\)/ }).first();
    if (await projectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectButton.click();
      await page.waitForTimeout(1000);
      
      // CP 탭 선택
      const cpTypeTab = page.locator('button').filter({ hasText: /^CP$/ }).last();
      if (await cpTypeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cpTypeTab.click();
        await page.waitForTimeout(1000);
      }
      
      // cp26-m001 선택
      const cpProject = page.locator('div').filter({ hasText: CP_ID }).first();
      if (await cpProject.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cpProject.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️ cp26-m001 프로젝트를 찾을 수 없습니다.');
        // 프로젝트 목록 확인
        const projectList = page.locator('div').filter({ hasText: /cp26/ });
        const count = await projectList.count();
        console.log(`   CP 프로젝트 개수: ${count}`);
        if (count > 0) {
          const firstProject = projectList.first();
          const text = await firstProject.textContent();
          console.log(`   첫 번째 프로젝트: ${text}`);
        }
      }
    }

    // CP 테이블들 확인
    const cpTables = [
      { name: 'CP 공정현황', table: 'cp_processes' },
      { name: 'CP 검출장치', table: 'cp_detectors' },
      { name: 'CP 관리항목', table: 'cp_control_items' },
      { name: 'CP 관리방법', table: 'cp_control_methods' },
      { name: 'CP 대응계획', table: 'cp_reaction_plans' },
    ];

    const results: Record<string, number> = {};

    for (const tableInfo of cpTables) {
      console.log(`🔍 ${tableInfo.name} 테이블 확인`);
      
      // 테이블 선택
      const tableRow = page.locator(`tr`).filter({ hasText: tableInfo.name }).first();
      if (await tableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tableRow.click();
        await page.waitForTimeout(2000);

        // 테이블 데이터 확인
        const rows = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr');
        const rowCount = await rows.count();
        
        results[tableInfo.name] = rowCount;
        
        console.log(`   ${tableInfo.name}: ${rowCount}개 행`);
        
        if (rowCount > 0) {
          const firstRow = rows.first();
          const rowText = await firstRow.textContent();
          console.log(`   첫 번째 행: ${rowText?.substring(0, 150)}`);
        } else {
          console.log(`   ❌ ${tableInfo.name}: 데이터 없음`);
        }
      } else {
        console.log(`   ⚠️ ${tableInfo.name} 테이블 행을 찾을 수 없습니다.`);
        results[tableInfo.name] = -1;
      }
    }

    // 최종 결과 출력
    console.log('\n📊 최종 결과:');
    console.log('   테이블별 데이터 개수:', results);
    
    const totalData = Object.values(results).reduce((sum, count) => sum + (count > 0 ? count : 0), 0);
    console.log(`   총 데이터 개수: ${totalData}`);
    
    if (totalData === 0) {
      console.error('❌ 모든 테이블에 데이터가 없습니다!');
      console.log('   API 호출 정보:', apiCalls);
      console.log('   콘솔 로그:', consoleLogs.slice(-30));
    } else {
      console.log('✅ 일부 테이블에 데이터가 있습니다.');
    }

    // 검증: 최소 1개 테이블에는 데이터가 있어야 함
    const hasData = Object.values(results).some(count => count > 0);
    expect(hasData).toBe(true);
  });
});

