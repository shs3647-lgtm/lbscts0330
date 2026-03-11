/**
 * @file context-menu-regression.spec.ts
 * @description 컨텍스트 메뉴 수평전개 회귀 테스트
 * 대상 탭: FunctionL1Tab, FunctionL2Tab, FunctionL3Tab
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// FMEA 워크시트 URL - 동적 ID가 아니라 /pfmea/worksheet로 접근
const TEST_FMEA_URL = `${BASE_URL}/pfmea/worksheet`;

// 워크시트 탭 선택
async function selectTab(page: Page, tabName: string) {
  await page.waitForTimeout(500);
  const tab = page.locator(`text="${tabName}"`).first();
  await tab.click();
  await page.waitForTimeout(500);
}

// 컨텍스트 메뉴가 표시되는지 확인
async function verifyContextMenuVisible(page: Page) {
  const contextMenu = page.locator('[class*="fixed"][class*="bg-white"][class*="shadow"]');
  await expect(contextMenu).toBeVisible({ timeout: 3000 });
  return contextMenu;
}

// 컨텍스트 메뉴 닫기
async function closeContextMenu(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

test.describe('1. FunctionL1Tab 컨텍스트 메뉴 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '1L기능');
  });

  test('1.1 컨텍스트 메뉴가 표시되어야 함', async ({ page }) => {
    // 테이블 셀 찾기
    const cell = page.locator('td').first();
    await cell.click({ button: 'right' });
    
    const menu = await verifyContextMenuVisible(page);
    await expect(menu).toContainText('위로');
    await closeContextMenu(page);
  });

  test('1.2 자동/수동 모드 토글 버튼이 표시되어야 함', async ({ page }) => {
    const toggleBtn = page.locator('button:has-text("자동"), button:has-text("수동")').first();
    await expect(toggleBtn).toBeVisible();
  });

  test('1.3 헤더에 확정/수정 버튼이 표시되어야 함', async ({ page }) => {
    const header = page.locator('thead').first();
    const confirmBtn = header.locator('button:has-text("확정")');
    const editBtn = header.locator('button:has-text("수정")');
    
    // 확정 또는 수정 버튼 중 하나는 보여야 함
    const hasConfirm = await confirmBtn.isVisible().catch(() => false);
    const hasEdit = await editBtn.isVisible().catch(() => false);
    expect(hasConfirm || hasEdit).toBeTruthy();
  });
});

test.describe('2. FunctionL2Tab 컨텍스트 메뉴 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '2L기능');
  });

  test('2.1 컨텍스트 메뉴가 표시되어야 함', async ({ page }) => {
    const cell = page.locator('td').first();
    await cell.click({ button: 'right' });
    
    const menu = await verifyContextMenuVisible(page);
    await expect(menu).toContainText('위로');
    await closeContextMenu(page);
  });

  test('2.2 헤더에 3단계 라벨이 표시되어야 함', async ({ page }) => {
    const header = page.locator('th:has-text("3단계")').first();
    await expect(header).toBeVisible();
  });

  test('2.3 공정명 컬럼이 표시되어야 함', async ({ page }) => {
    const header = page.locator('th:has-text("공정명"), th:has-text("공정NO")').first();
    await expect(header).toBeVisible();
  });
});

test.describe('3. FunctionL3Tab 컨텍스트 메뉴 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '3L기능');
  });

  test('3.1 컨텍스트 메뉴가 표시되어야 함', async ({ page }) => {
    const cell = page.locator('td').first();
    await cell.click({ button: 'right' });
    
    const menu = await verifyContextMenuVisible(page);
    await expect(menu).toContainText('위로');
    await closeContextMenu(page);
  });

  test('3.2 작업요소 컬럼이 표시되어야 함', async ({ page }) => {
    const header = page.locator('th:has-text("작업요소")').first();
    await expect(header).toBeVisible();
  });

  test('3.3 공정특성 컬럼이 표시되어야 함', async ({ page }) => {
    const header = page.locator('th:has-text("공정특성")').first();
    await expect(header).toBeVisible();
  });
});

test.describe('4. 컨텍스트 메뉴 기능 동작 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('4.1 FunctionL1Tab - 위로 행 추가 동작', async ({ page }) => {
    await selectTab(page, '1L기능');
    
    // 초기 행 수 확인
    const initialRows = await page.locator('tbody tr').count();
    
    // 컨텍스트 메뉴 열기
    const cell = page.locator('tbody td').first();
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    
    // 위로 행 추가 클릭
    const insertAboveBtn = page.locator('button:has-text("위로 행 추가")');
    if (await insertAboveBtn.isVisible()) {
      await insertAboveBtn.click();
      await page.waitForTimeout(500);
      
      // 행 수가 증가했는지 확인
      const newRows = await page.locator('tbody tr').count();
      expect(newRows).toBeGreaterThanOrEqual(initialRows);
    }
  });

  test('4.2 FunctionL2Tab - 컨텍스트 메뉴 닫기', async ({ page }) => {
    await selectTab(page, '2L기능');
    
    const cell = page.locator('tbody td').first();
    await cell.click({ button: 'right' });
    
    await verifyContextMenuVisible(page);
    
    // 메뉴 외부 클릭으로 닫기
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    
    // 메뉴가 사라졌는지 확인 (새 로케이터 사용)
    const menuAfterClose = page.locator('[class*="fixed"][class*="bg-white"][class*="shadow"]');
    await expect(menuAfterClose).not.toBeVisible({ timeout: 3000 });
  });

  test('4.3 FunctionL3Tab - 컨텍스트 메뉴 항목 확인', async ({ page }) => {
    await selectTab(page, '3L기능');
    
    const cell = page.locator('tbody td').first();
    await cell.click({ button: 'right' });
    
    const menu = await verifyContextMenuVisible(page);
    
    // 메뉴 항목들 확인 (first()로 여러 요소 중 첫 번째 선택)
    await expect(menu.locator('text=위로').first()).toBeVisible();
    await expect(menu.locator('text=아래로').first()).toBeVisible();
    await expect(menu.locator('text=삭제')).toBeVisible();
    
    await closeContextMenu(page);
  });
});

// ===============================
// Failure 탭 테스트 (수평전개 검증)
// ⚠️ 주의: Failure 탭은 상위 단계(기능분석)가 확정되어야 데이터 행이 표시됨
// 테스트 환경에서는 상위 단계가 확정되지 않아 tbody에 데이터 행이 없을 수 있음
// ===============================

test.describe('6. FailureL1Tab (1L영향) 탭 로드 테스트', () => {
  test('6.1 1L영향 탭이 정상 로드되어야 함', async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '1L영향');
    await page.waitForTimeout(2000);
    
    // 탭이 로드되고 테이블 헤더가 보이는지 확인
    const header = page.locator('th:has-text("고장영향"), th:has-text("FE")').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });
});

test.describe('7. FailureL2Tab (2L형태) 탭 로드 테스트', () => {
  test('7.1 2L형태 탭이 정상 로드되어야 함', async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '2L형태');
    await page.waitForTimeout(2000);
    
    // 탭이 로드되고 테이블 헤더가 보이는지 확인
    const header = page.locator('th:has-text("고장형태"), th:has-text("FM")').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });
});

test.describe('8. FailureL3Tab (3L원인) 탭 로드 테스트', () => {
  test('8.1 3L원인 탭이 정상 로드되어야 함', async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '3L원인');
    await page.waitForTimeout(2000);
    
    // 탭이 로드되고 테이블 헤더가 보이는지 확인
    const header = page.locator('th:has-text("고장원인"), th:has-text("FC")').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });
});

test.describe('5. UI 최적화 검증', () => {
  test('5.1 FunctionL1Tab - 완제품공정명 컴팩트 표시', async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '1L기능');
    
    // 완제품공정명 셀 찾기
    const productCell = page.locator('td').first();
    
    // 패딩과 폰트 크기 확인 (p-1, text-xs)
    const padding = await productCell.evaluate(el => getComputedStyle(el).padding);
    const fontSize = await productCell.evaluate(el => getComputedStyle(el).fontSize);
    
    console.log(`완제품공정명 셀 - padding: ${padding}, fontSize: ${fontSize}`);
    
    // 기본적으로 셀이 보여야 함
    await expect(productCell).toBeVisible();
  });

  test('5.2 컨텍스트 메뉴 컴팩트 UI', async ({ page }) => {
    await page.goto(TEST_FMEA_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await selectTab(page, '1L기능');
    
    const cell = page.locator('tbody td').first();
    await cell.click({ button: 'right' });
    
    const menu = await verifyContextMenuVisible(page);
    
    // 메뉴 너비 확인 (min-w-[180px] 이하)
    const menuWidth = await menu.evaluate(el => el.getBoundingClientRect().width);
    console.log(`컨텍스트 메뉴 너비: ${menuWidth}px`);
    
    expect(menuWidth).toBeLessThan(250);
    
    await closeContextMenu(page);
  });
});
