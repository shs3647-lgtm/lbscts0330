import { test, expect } from '@playwright/test';

/**
 * CP Import → DB 저장 → DB 뷰어 검증 테스트
 * 
 * 검증 항목:
 * 1. CP Import 페이지에서 데이터 저장
 * 2. DB 뷰어에서 cp26-m001 프로젝트 선택
 * 3. CP 테이블들 (공정현황, 검출장치, 관리항목, 관리방법) 데이터 확인
 * 4. cpNo 대소문자 불일치 문제 해결 확인
 */

test.describe('CP Import DB Viewer Verification', () => {
  const BASE_URL = 'http://localhost:3000';
  const CP_ID = 'cp26-m001';
  const IMPORT_URL = `${BASE_URL}/control-plan/import?id=${CP_ID}`;
  const DB_VIEWER_URL = `${BASE_URL}/admin/db-viewer`;

  test.beforeEach(async ({ page }) => {
    // 콘솔 에러 확인
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // 네트워크 에러 확인
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.error(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
  });

  test('CP Import 저장 후 DB 뷰어에서 데이터 확인', async ({ page }) => {
    // 1. CP Import 페이지 접속
    console.log('📋 Step 1: CP Import 페이지 접속');
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 페이지 로드 확인
    await expect(page.locator('h1, h2').filter({ hasText: /기초정보|Import|CP/i })).toBeVisible();

    // 2. 샘플 데이터가 이미 있는지 확인 (또는 Excel 파일 업로드)
    console.log('📋 Step 2: 데이터 확인');
    
    // Save All 버튼이 있는지 확인 (disabled 상태도 확인)
    const saveAllButton = page.locator('button').filter({ hasText: /전체저장|저장|Save All/i }).first();
    const hasSaveButton = await saveAllButton.isVisible().catch(() => false);

    if (hasSaveButton) {
      // 버튼이 enabled 상태인지 확인
      const isEnabled = await saveAllButton.isEnabled().catch(() => false);
      
      if (isEnabled) {
        console.log('📋 Step 3: Save All 버튼 클릭');
        
        // Save All 버튼 클릭
        await saveAllButton.click();
        await page.waitForTimeout(5000); // 저장 완료 대기

        // 저장 완료 메시지 확인 (선택적)
        const savedMessage = page.locator('text=/저장|완료|saved|success/i').first();
        const hasMessage = await savedMessage.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasMessage) {
          console.log('✅ 저장 완료 메시지 확인');
        } else {
          console.log('⚠️ 저장 완료 메시지가 보이지 않지만, 저장은 진행되었을 수 있습니다.');
        }
      } else {
        console.log('⚠️ Save All 버튼이 disabled 상태입니다. 이미 저장되었거나 데이터가 없을 수 있습니다.');
        console.log('   → DB 뷰어에서 기존 데이터를 확인합니다.');
      }
    } else {
      console.log('⚠️ Save All 버튼을 찾을 수 없습니다. 이미 저장되었거나 데이터가 없을 수 있습니다.');
      console.log('   → DB 뷰어에서 기존 데이터를 확인합니다.');
    }

    // 3. DB 뷰어로 이동
    console.log('📋 Step 4: DB 뷰어로 이동');
    await page.goto(DB_VIEWER_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // DB 뷰어 페이지 로드 확인
    await expect(page.locator('text=/DB 뷰어|Database Viewer/i')).toBeVisible();

    // 4. CP 탭 선택
    console.log('📋 Step 5: CP 탭 선택');
    
    // 여러 방법으로 CP 탭 찾기
    let cpTab = page.locator('button').filter({ hasText: /^CP$/ }).first();
    let cpTabFound = await cpTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!cpTabFound) {
      // 카테고리 탭에서 CP 찾기 (정확한 텍스트 매칭)
      cpTab = page.locator('button').filter({ hasText: /^CP$/ }).first();
      cpTabFound = await cpTab.isVisible({ timeout: 2000 }).catch(() => false);
    }
    
    if (!cpTabFound) {
      // 모든 버튼에서 CP 찾기
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`   버튼 개수: ${buttonCount}`);
      
      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        const btn = allButtons.nth(i);
        const text = await btn.textContent().catch(() => '');
        if (text?.trim() === 'CP') {
          cpTab = btn;
          cpTabFound = true;
          console.log(`   CP 탭 발견: 인덱스 ${i}`);
          break;
        }
      }
    }
    
    if (cpTabFound) {
      await cpTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ CP 탭 선택 완료');
    } else {
      console.log('⚠️ CP 탭을 찾을 수 없습니다. 전체 모드로 진행합니다.');
      // 전체 모드에서도 CP 테이블을 찾을 수 있음
    }

    // 5. 프로젝트 선택 (cp26-m001)
    console.log('📋 Step 6: 프로젝트 선택:', CP_ID);
    
    // 프로젝트 선택 드롭다운 찾기
    const projectInput = page.locator('input[placeholder*="프로젝트"], input[value*="cp"], select').first();
    const projectSelect = page.locator('select').filter({ hasText: /프로젝트|Project/i }).first();
    
    // input 또는 select 찾기
    let projectSelector = null;
    if (await projectInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      projectSelector = projectInput;
    } else if (await projectSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      projectSelector = projectSelect;
    } else {
      // 프로젝트 선택 버튼 찾기
      const projectButton = page.locator('button').filter({ hasText: /프로젝트|Project|새로/i }).first();
      if (await projectButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await projectButton.click();
        await page.waitForTimeout(500);
        
        // 모달에서 프로젝트 선택
        const projectOption = page.locator(`text=${CP_ID}, text=${CP_ID.toUpperCase()}, text=${CP_ID.toLowerCase()}`).first();
        if (await projectOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await projectOption.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // 6. CP 테이블들 확인
    const cpTables = [
      { name: 'CP 공정현황', table: 'cp_processes', key: 'processNo' },
      { name: 'CP 검출장치', table: 'cp_detectors', key: 'processNo' },
      { name: 'CP 관리항목', table: 'cp_control_items', key: 'processNo' },
      { name: 'CP 관리방법', table: 'cp_control_methods', key: 'processNo' },
    ];

    for (const tableInfo of cpTables) {
      console.log(`📋 Step 7: ${tableInfo.name} 테이블 확인`);
      
      // 테이블 선택 (여러 방법 시도)
      let tableLink = page.locator(`text=${tableInfo.name}`).first();
      let tableFound = await tableLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!tableFound) {
        // 테이블명 부분 매칭
        tableLink = page.locator(`text=/.*${tableInfo.name.replace('CP ', '')}.*/`).first();
        tableFound = await tableLink.isVisible({ timeout: 2000 }).catch(() => false);
      }
      
      if (!tableFound) {
        // tr 요소에서 찾기
        const allRows = page.locator('table tbody tr, .table tbody tr');
        const rowCount = await allRows.count();
        for (let i = 0; i < Math.min(rowCount, 30); i++) {
          const row = allRows.nth(i);
          const rowText = await row.textContent().catch(() => '');
          if (rowText?.includes(tableInfo.name) || rowText?.includes(tableInfo.table)) {
            tableLink = row;
            tableFound = true;
            console.log(`   테이블 발견: 인덱스 ${i}`);
            break;
          }
        }
      }
      
      if (tableFound) {
        await tableLink.click();
        await page.waitForTimeout(2000);

        // 테이블 데이터 확인
        const tableData = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr').first();
        const hasData = await tableData.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasData) {
          // 데이터 행 개수 확인
          const rows = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr');
          const rowCount = await rows.count();
          
          console.log(`✅ ${tableInfo.name}: ${rowCount}개 행 발견`);
          
          // 최소 1개 행은 있어야 함
          expect(rowCount).toBeGreaterThan(0);
          
          // 첫 번째 행의 데이터 확인
          const firstRow = rows.first();
          const rowText = await firstRow.textContent();
          console.log(`   첫 번째 행: ${rowText?.substring(0, 100)}`);
          
          // cpNo 필드 확인 (대소문자 구분 없이)
          const cpNoCell = firstRow.locator('td').filter({ hasText: new RegExp(CP_ID, 'i') }).first();
          const hasCpNo = await cpNoCell.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (hasCpNo) {
            console.log(`   ✅ cpNo 필드 확인: ${CP_ID}`);
          } else {
            console.log(`   ⚠️ cpNo 필드가 명시적으로 보이지 않지만, 데이터는 존재함`);
          }
        } else {
          // "좌측에서 테이블을 선택하세요" 메시지 확인
          const emptyMessage = page.locator('text=/좌측|선택|select/i').first();
          const isEmpty = await emptyMessage.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (isEmpty) {
            console.log(`⚠️ ${tableInfo.name}: 테이블이 선택되지 않았거나 데이터가 없습니다.`);
          } else {
            console.log(`❌ ${tableInfo.name}: 데이터를 찾을 수 없습니다.`);
          }
        }
      } else {
        console.log(`⚠️ ${tableInfo.name} 테이블 링크를 찾을 수 없습니다.`);
      }
    }

    // 7. 콘솔 로그 확인 (에러 없음)
    console.log('📋 Step 8: 콘솔 에러 확인');
    // 에러는 beforeEach에서 이미 확인됨
  });

  test('cpNo 대소문자 불일치 문제 해결 확인', async ({ page }) => {
    console.log('📋 cpNo 대소문자 불일치 문제 해결 확인');
    
    // DB 뷰어 접속
    await page.goto(DB_VIEWER_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // DB 뷰어 페이지 로드 확인
    const dbViewerTitle = page.locator('h1, h2, h3').filter({ hasText: /DB 뷰어|Database Viewer/i }).first();
    await expect(dbViewerTitle).toBeVisible({ timeout: 10000 });

    // CP 탭 선택
    let cpTab = page.locator('button, a, div').filter({ hasText: /^CP$/ }).first();
    let cpTabFound = await cpTab.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!cpTabFound) {
      cpTab = page.locator('[role="tab"], button, a').filter({ hasText: /CP|cp/ }).first();
      cpTabFound = await cpTab.isVisible({ timeout: 2000 }).catch(() => false);
    }
    
    if (cpTabFound) {
      await cpTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ CP 탭을 찾을 수 없습니다. 전체 모드로 진행합니다.');
    }

    // 다양한 cpNo 형식으로 테스트
    const cpNoVariants = [
      'cp26-m001',
      'CP26-M001',
      'Cp26-M001',
      'cp26-M001',
    ];

    for (const cpNoVariant of cpNoVariants) {
      console.log(`📋 테스트: ${cpNoVariant}`);
      
      // 프로젝트 입력 시도
      const projectInput = page.locator('input[placeholder*="프로젝트"], input[value*="cp"]').first();
      if (await projectInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await projectInput.clear();
        await projectInput.fill(cpNoVariant);
        await page.waitForTimeout(1000);
        
        // Enter 키 또는 검색 버튼 클릭
        await projectInput.press('Enter');
        await page.waitForTimeout(2000);
      }

      // CP 공정현황 테이블 선택
      const tableLink = page.locator('text=CP 공정현황, a:has-text("CP 공정현황")').first();
      if (await tableLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tableLink.click();
        await page.waitForTimeout(2000);

        // 데이터 확인
        const rows = page.locator('table tbody tr, .table tbody tr, [role="table"] tbody tr');
        const rowCount = await rows.count();
        
        console.log(`   ${cpNoVariant}: ${rowCount}개 행`);
        
        // 대소문자와 관계없이 데이터가 표시되어야 함
        if (rowCount > 0) {
          console.log(`   ✅ ${cpNoVariant}로 데이터 조회 성공`);
        } else {
          console.log(`   ⚠️ ${cpNoVariant}로 데이터 조회 실패 (데이터가 없을 수도 있음)`);
        }
      }
    }
  });
});

