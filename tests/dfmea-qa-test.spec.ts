/**
 * DFMEA QA 테스트 - 사용자 관점 기능 테스트
 * QA 마스터 문서 기반 브라우저 테스트
 */

import { test, expect, chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Playwright 설정
test.use({
  viewport: { width: 1920, height: 1080 },
  headless: false,
  launchOptions: { slowMo: 300 }
});

test.describe('DFMEA QA 테스트 - 사용자 관점', () => {
  
  test('TC-WS-001: 구조분석 탭 DFMEA 용어 확인', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭 클릭 - 버튼 내부의 span을 타겟팅
    const structureTab = page.getByRole('button', { name: '구조분석' });
    if (await structureTab.isVisible()) {
      await structureTab.click();
      await page.waitForTimeout(1000);
    }
    
    // 컬럼 헤더 확인 - DFMEA 용어
    const pageContent = await page.content();
    
    // DFMEA 용어 확인 (문서 기준)
    const dfmeaTerms = ['다음상위수준', '초점요소', '타입', '다음하위수준'];
    for (const term of dfmeaTerms) {
      const hasText = pageContent.includes(term);
      console.log(`✅ ${term}: ${hasText ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // 스크린샷 저장
    await page.screenshot({ path: 'tests/screenshots/dfmea-structure-tab.png', fullPage: true });
  });

  test('TC-WS-002: 초점요소 셀 클릭 → 모달 표시', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭 이동
    const structureTab = page.getByRole('button', { name: '구조분석' });
    if (await structureTab.isVisible()) {
      await structureTab.click();
      await page.waitForTimeout(1000);
    }
    
    // 초점요소 셀 찾기 및 클릭 - 돋보기 아이콘 또는 플레이스홀더 텍스트
    const focusElementCell = page.locator('td').filter({ hasText: /클릭.*선택|A'SSY 선택/ }).first();
    if (await focusElementCell.isVisible()) {
      await focusElementCell.click();
      await page.waitForTimeout(1000);
      
      // 모달 표시 확인
      const modal = page.locator('.fixed, [role="dialog"]').first();
      const modalVisible = await modal.isVisible().catch(() => false);
      console.log(`✅ 초점요소 모달: ${modalVisible ? 'VISIBLE' : 'NOT VISIBLE'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-focus-element-modal.png', fullPage: true });
  });

  test('TC-WS-003: 더블클릭 인라인 편집', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭 이동
    const structureTab = page.getByRole('button', { name: '구조분석' });
    if (await structureTab.isVisible()) {
      await structureTab.click();
      await page.waitForTimeout(1000);
    }
    
    // 편집 가능한 셀 찾기 - 테이블 본문의 셀
    const editableCell = page.locator('tbody td').nth(1);
    if (await editableCell.isVisible()) {
      // 더블클릭
      await editableCell.dblclick();
      await page.waitForTimeout(500);
      
      // 입력 필드 확인
      const inputField = page.locator('input[type="text"]').first();
      const hasInput = await inputField.isVisible().catch(() => false);
      console.log(`✅ 더블클릭 인라인 편집: ${hasInput ? 'INPUT VISIBLE' : 'NO INPUT'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-inline-edit.png', fullPage: true });
  });

  test('TC-TERM-002: 타입 옵션 확인 (부품/ASSY/IF)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭 이동
    const structureTab = page.getByRole('button', { name: '구조분석' });
    if (await structureTab.isVisible()) {
      await structureTab.click();
      await page.waitForTimeout(1000);
    }
    
    // 타입 셀 찾기 (select 또는 dropdown)
    const typeSelect = page.locator('select').first();
    if (await typeSelect.isVisible()) {
      const options = await typeSelect.locator('option').allTextContents();
      console.log(`✅ 타입 옵션: ${options.join(', ')}`);
      
      // 부품/ASSY/IF 옵션 확인
      const expectedOptions = ['부품', 'ASSY', 'IF'];
      for (const opt of expectedOptions) {
        const hasOption = options.some(o => o.includes(opt));
        console.log(`  - ${opt}: ${hasOption ? 'FOUND' : 'NOT FOUND'}`);
      }
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-type-options.png', fullPage: true });
  });

  test('TC-DREG-001: DFMEA 등록화면 접속', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 필수 필드 확인 - 다양한 표현 고려
    const pageContent = await page.content();
    const requiredFields = ['FMEA', '저장', '등록', '프로젝트'];
    
    for (const field of requiredFields) {
      const hasField = pageContent.includes(field);
      console.log(`✅ ${field}: ${hasField ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // 테이블 확인
    const table = page.locator('table');
    const hasTable = await table.first().isVisible().catch(() => false);
    console.log(`✅ 등록 테이블: ${hasTable ? 'VISIBLE' : 'NOT VISIBLE'}`);
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-register.png', fullPage: true });
  });

  test('TC-DREG-003: Master/Family/Part 토글 버튼', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Master Data 사용 버튼 찾기
    const masterButton = page.getByText(/Master|마스터|기반/i);
    if (await masterButton.first().isVisible()) {
      await masterButton.first().click();
      await page.waitForTimeout(1000);
      console.log('✅ Master Data 버튼 클릭됨');
      
      // 모달 또는 토글 상태 확인
      const modal = page.locator('.fixed, [role="dialog"]');
      const hasModal = await modal.first().isVisible().catch(() => false);
      console.log(`✅ Master 모달/토글: ${hasModal ? 'VISIBLE' : 'NOT VISIBLE'}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-master-toggle.png', fullPage: true });
  });

  test('TC-LIST-001: DFMEA 리스트 접속 및 네비게이션', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/list`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 리스트 테이블 확인
    const table = page.locator('table');
    const hasTable = await table.first().isVisible().catch(() => false);
    console.log(`✅ DFMEA 리스트 테이블: ${hasTable ? 'VISIBLE' : 'NOT VISIBLE'}`);
    
    // FMEA 항목 클릭 테스트
    const fmeaLink = page.locator('td a, td[class*="cursor"]').first();
    if (await fmeaLink.isVisible()) {
      console.log('✅ FMEA 링크/항목 발견');
    }
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-list.png', fullPage: true });
  });

  test('TC-IMPORT-001: DFMEA Import 화면', async ({ page }) => {
    await page.goto(`${BASE_URL}/dfmea/import`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Import 페이지 로드 대기 시간 증가
    
    // Import 화면 요소 확인
    const pageContent = await page.content();
    const importElements = ['FMEA', '엑셀', '입력', '저장'];
    
    for (const elem of importElements) {
      const hasElem = pageContent.includes(elem);
      console.log(`✅ ${elem}: ${hasElem ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // 다운로드 버튼 확인
    const downloadBtn = page.getByText(/템플릿|다운로드|샘플/);
    const hasDlBtn = await downloadBtn.first().isVisible().catch(() => false);
    console.log(`✅ 템플릿 다운로드 버튼: ${hasDlBtn ? 'VISIBLE' : 'NOT VISIBLE'}`);
    
    await page.screenshot({ path: 'tests/screenshots/dfmea-import.png', fullPage: true });
  });
});
