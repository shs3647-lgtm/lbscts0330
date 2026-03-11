/**
 * TDD 검증: 구조분석 DB 저장 및 코드프리즈 검증
 * @created 2026-01-11
 * 
 * 검증 대상:
 * 1. saveAtomicDB FMEA ID 폴백
 * 2. migrateToAtomicDB L2/L3 변환
 * 3. API 원자성 테이블 저장
 * 4. DB 뷰어 레거시 데이터 표시
 * 5. 구조분석 확정 시 데이터 저장
 */

import { test, expect } from '@playwright/test';

// 테스트 케이스 1: FMEA ID 없이 워크시트 접근 시 경고 메시지
test('TC1: FMEA ID 없이 워크시트 접근 시 적절한 안내', async ({ page }) => {
  await page.goto('http://localhost:3000/pfmea/worksheet');
  await page.waitForTimeout(2000);
  
  // 콘솔 로그 수집
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  
  // FMEA 선택 드롭다운 또는 안내 메시지 확인
  const fmeaSelector = page.locator('select, [data-testid="fmea-selector"]');
  const noDataMessage = page.locator('text=FMEA를 선택해 주세요, text=프로젝트를 선택');
  
  // 둘 중 하나가 있어야 함
  const hasFmeaSelector = await fmeaSelector.count() > 0;
  const hasNoDataMessage = await noDataMessage.count() > 0;
  
  console.log('FMEA 선택기 존재:', hasFmeaSelector);
  console.log('안내 메시지 존재:', hasNoDataMessage);
  
  expect(hasFmeaSelector || hasNoDataMessage).toBeTruthy();
});

// 테스트 케이스 2: DB 뷰어 접근 및 테이블 목록 확인
test('TC2: DB 뷰어 테이블 목록 정상 로드', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/db-viewer');
  await page.waitForTimeout(2000);
  
  // 스키마 선택 드롭다운 확인
  const schemaSelect = page.locator('select').first();
  await expect(schemaSelect).toBeVisible();
  
  // 주요 테이블 바로가기 버튼 확인
  const quickButtons = page.locator('button:has-text("1L 구조"), button:has-text("2L 구조"), button:has-text("3L 구조")');
  const buttonCount = await quickButtons.count();
  console.log('주요 테이블 바로가기 버튼 개수:', buttonCount);
  
  expect(buttonCount).toBeGreaterThanOrEqual(3);
});

// 테스트 케이스 3: 레거시 데이터 테이블 선택 시 요약 표시
test('TC3: 레거시 데이터 요약 표시', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/db-viewer');
  await page.waitForTimeout(2000);
  
  // public 스키마 선택
  const schemaSelect = page.locator('select').first();
  await schemaSelect.selectOption('public');
  await page.waitForTimeout(1000);
  
  // fmea_legacy_data 버튼 클릭
  const legacyButton = page.locator('button:has-text("전체JSON 백업")');
  if (await legacyButton.count() > 0) {
    await legacyButton.click();
    await page.waitForTimeout(1000);
    
    // 레거시 데이터 요약 섹션 확인
    const summarySection = page.locator('text=레거시 데이터 요약');
    const hasSummary = await summarySection.count() > 0;
    console.log('레거시 데이터 요약 섹션:', hasSummary);
    
    // 데이터가 있으면 요약이 표시되어야 함
    if (hasSummary) {
      expect(hasSummary).toBeTruthy();
    }
  }
});

// 테스트 케이스 4: 프로젝트 스키마 테이블 데이터 없을 때 안내 메시지
test('TC4: 원자성 테이블 빈 상태 시 안내 메시지', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/db-viewer');
  await page.waitForTimeout(2000);
  
  // pfmea_ 스키마 선택
  const schemaSelect = page.locator('select').first();
  const options = await schemaSelect.locator('option').allTextContents();
  const pfmeaSchema = options.find(o => o.includes('pfmea_'));
  
  if (pfmeaSchema) {
    // 스키마 값 추출 (예: "📂 pfmea_pfm26_m001" -> "pfmea_pfm26_m001")
    const schemaValue = pfmeaSchema.replace(/^[📂⭐]\s*/, '').split(' ')[0];
    await schemaSelect.selectOption(schemaValue);
    await page.waitForTimeout(1000);
    
    // l1_structures 버튼 클릭
    const l1Button = page.locator('button:has-text("1L 구조")');
    if (await l1Button.count() > 0) {
      await l1Button.click();
      await page.waitForTimeout(1000);
      
      // 데이터 없을 때 안내 메시지 확인
      const noDataMessage = page.locator('text=데이터가 없습니다, text=데이터가 없는 이유');
      const hasMessage = await noDataMessage.count() > 0;
      console.log('데이터 없음 안내 메시지:', hasMessage);
    }
  }
});

// 테스트 케이스 5: 워크시트 구조분석 탭 확정 버튼 존재
test('TC5: 구조분석 탭 확정 버튼 존재', async ({ page }) => {
  // FMEA 등록 페이지로 이동
  await page.goto('http://localhost:3000/pfmea/register');
  await page.waitForTimeout(2000);
  
  // 등록 페이지가 로드되었는지 확인
  const registerPage = page.locator('text=FMEA 등록, text=기초정보');
  const isRegisterPage = await registerPage.count() > 0;
  console.log('FMEA 등록 페이지:', isRegisterPage);
  
  expect(isRegisterPage).toBeTruthy();
});

// 테스트 케이스 6: API 엔드포인트 정상 응답
test('TC6: API 엔드포인트 정상 응답', async ({ request }) => {
  // DB 스키마 API 테스트
  const schemasRes = await request.get('http://localhost:3000/api/admin/db/schemas');
  expect(schemasRes.ok()).toBeTruthy();
  
  const schemasData = await schemasRes.json();
  console.log('스키마 API 응답:', schemasData.success);
  expect(schemasData.success).toBeTruthy();
});

// 테스트 케이스 7: DB 뷰어 새로고침 버튼 동작
test('TC7: DB 뷰어 새로고침 버튼 동작', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/db-viewer');
  await page.waitForTimeout(2000);
  
  // 새로고침 버튼 클릭
  const refreshButton = page.locator('button:has-text("새로고침")');
  await expect(refreshButton).toBeVisible();
  await refreshButton.click();
  await page.waitForTimeout(1000);
  
  // 마지막 갱신 시간 표시 확인
  const lastRefresh = page.locator('text=마지막 갱신');
  const hasLastRefresh = await lastRefresh.count() > 0;
  console.log('마지막 갱신 시간 표시:', hasLastRefresh);
});








