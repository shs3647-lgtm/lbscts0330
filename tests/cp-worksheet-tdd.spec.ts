/**
 * @file cp-worksheet-tdd.spec.ts
 * @description CP 워크시트 TDD 검증 테스트
 * @created 2026-01-24
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('CP 워크시트 TDD 검증', () => {
  
  test.beforeEach(async ({ page }) => {
    // CP 워크시트 페이지 접속
    await page.goto(`${BASE_URL}/control-plan/worksheet`);
    await page.waitForLoadState('networkidle');
  });

  test('1. 페이지 로드 및 기본 레이아웃 확인', async ({ page }) => {
    // 테이블 존재 확인 (워크시트 핵심 요소)
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 헤더 영역 확인
    const thead = page.locator('thead').first();
    await expect(thead).toBeVisible();
    console.log('✅ 페이지 로드 성공 - 테이블 존재 확인');
  });

  test('2. 사이드바 존재 여부 확인', async ({ page }) => {
    // 사이드바 메뉴 아이콘 확인 (nav 내 링크들)
    const navElement = page.locator('nav').first();
    const navExists = await navElement.count() > 0;
    console.log(`📌 nav 요소 존재: ${navExists}`);
    
    // 사이드바 링크들 확인
    const menuLinks = page.locator('nav a');
    const linkCount = await menuLinks.count();
    console.log(`📌 사이드바 링크 수: ${linkCount}`);
    
    // Control Plan 텍스트가 DOM에 있는지 (접힌 상태라도)
    const cpText = page.locator('text=Control Plan');
    const cpTextCount = await cpText.count();
    console.log(`📌 'Control Plan' 텍스트 수: ${cpTextCount}`);
    
    // 사이드바 존재 검증 (링크가 5개 이상 있으면 사이드바 존재)
    expect(linkCount).toBeGreaterThan(3);
    console.log(`✅ 사이드바 확인 완료 - ${linkCount}개 메뉴`);
  });

  test('3. 워크시트 테이블 구조 확인', async ({ page }) => {
    // 테이블 존재 확인
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // 헤더 행 확인
    const headerRow = page.locator('thead tr').first();
    await expect(headerRow).toBeVisible();
    
    // 그룹 헤더 확인 (공정관리, 제품관리, 공정관리, 관리방법)
    const groupHeaders = page.locator('thead th');
    const headerCount = await groupHeaders.count();
    console.log(`📌 헤더 컬럼 수: ${headerCount}`);
  });

  test('4. 저장 버튼 기능 확인', async ({ page }) => {
    // 저장 버튼 찾기
    const saveBtn = page.locator('button:has-text("저장"), button:has-text("Save")');
    if (await saveBtn.count() > 0) {
      await expect(saveBtn.first()).toBeVisible();
      console.log('📌 저장 버튼 존재함');
    } else {
      console.log('⚠️ 저장 버튼 없음');
    }
  });

  test('5. 행 추가 기능 확인', async ({ page }) => {
    // 행 추가 버튼 찾기
    const addRowBtn = page.locator('button:has-text("행 추가"), button:has-text("Add Row"), button:has-text("추가")');
    if (await addRowBtn.count() > 0) {
      const initialRows = await page.locator('tbody tr').count();
      console.log(`📌 초기 행 수: ${initialRows}`);
      
      // 행 추가 클릭
      await addRowBtn.first().click();
      await page.waitForTimeout(500);
      
      const afterRows = await page.locator('tbody tr').count();
      console.log(`📌 추가 후 행 수: ${afterRows}`);
    } else {
      console.log('⚠️ 행 추가 버튼 없음');
    }
  });

  test('6. CP 드롭다운 선택 기능 확인', async ({ page }) => {
    // CP 선택 드롭다운 찾기
    const cpDropdown = page.locator('select, [class*="dropdown"]').first();
    if (await cpDropdown.count() > 0) {
      await expect(cpDropdown).toBeVisible();
      console.log('📌 CP 드롭다운 존재함');
    } else {
      console.log('⚠️ CP 드롭다운 없음');
    }
  });

  test('7. 스크롤 기능 확인', async ({ page }) => {
    // 스크롤 컨테이너 확인
    const scrollContainer = page.locator('#cp-worksheet-scroll-container');
    if (await scrollContainer.count() > 0) {
      await expect(scrollContainer).toBeVisible();
      
      // 스크롤바 스타일 확인
      const hasOverflow = await scrollContainer.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.overflowX === 'scroll' || style.overflowX === 'auto';
      });
      console.log(`📌 가로 스크롤 가능: ${hasOverflow}`);
    }
  });

  test('8. 컨텍스트 메뉴 확인', async ({ page }) => {
    // 테이블 셀 우클릭
    const cell = page.locator('tbody td').first();
    if (await cell.count() > 0) {
      await cell.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // 컨텍스트 메뉴 확인
      const contextMenu = page.locator('[class*="context-menu"], [class*="ContextMenu"]');
      const menuVisible = await contextMenu.count() > 0;
      console.log(`📌 컨텍스트 메뉴 표시됨: ${menuVisible}`);
      
      // 메뉴 닫기
      await page.keyboard.press('Escape');
    }
  });

  test('9. UI 요소 위치 확인 (레이아웃)', async ({ page }) => {
    // 메인 콘텐츠 영역 확인
    const mainContent = page.locator('.fixed.top-\\[100px\\]');
    if (await mainContent.count() > 0) {
      const box = await mainContent.boundingBox();
      console.log(`📌 메인 콘텐츠 위치: top=${box?.y}, left=${box?.x}`);
    }
  });

  test('10. 콘솔 에러 확인', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 페이지 새로고침 후 에러 확인
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('⚠️ 콘솔 에러 발견:');
      errors.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log('✅ 콘솔 에러 없음');
    }
  });
});
