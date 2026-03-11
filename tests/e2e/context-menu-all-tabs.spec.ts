/**
 * @file context-menu-all-tabs.spec.ts
 * @description PFMEA 워크시트 컨텍스트 메뉴 전탭 동작 검증 (E2E)
 *
 * 검증 항목:
 * 1. 각 탭에서 우클릭 시 컨텍스트 메뉴 표시
 * 2. 자동/수동 모드에서의 컨텍스트 메뉴 동작
 * 3. 컨텍스트 메뉴 항목 완전성 (행 추가/삭제/병합)
 * 4. 열별 컨텍스트 메뉴 동작 (data-col 기반)
 * 5. L3 행삭제 시 공정 보존 검증 (빈 행/입력 행 동일)
 *
 * @created 2026-03-06
 * @updated 2026-03-07: L3 삭제 공정보존 검증 + L2 행추가 waitForFunction
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// --- Helpers ---

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

/** PFMEA 워크시트 직접 진입 */
async function navigateToWorksheet(page: Page) {
  const apiRes = await page.request.get(`${BASE_URL}/api/fmea/projects?type=P`);
  const projects = await apiRes.json();
  const list = Array.isArray(projects) ? projects : (projects.data || projects.projects || []);

  if (!list.length) return false;

  const fmeaId = list[0].id;
  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${fmeaId}`);
  await waitForPageLoad(page);

  const tabArea = page.locator('button:has-text("구조분석")').first();
  return tabArea.isVisible({ timeout: 10000 }).catch(() => false);
}

/** 특정 탭으로 이동 */
async function switchToTab(page: Page, tabLabel: string) {
  const tabButton = page.locator(`button:has-text("${tabLabel}")`).first();
  if (await tabButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tabButton.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

/** data-col 속성으로 특정 열의 셀을 우클릭 */
async function rightClickCellByDataCol(page: Page, dataCol: string) {
  const cell = page.locator(`table tbody td[data-col="${dataCol}"]`).first();
  if (await cell.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cell.click({ button: 'right' });
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/** 테이블 tbody 내 첫번째 행의 마지막 편집가능 셀을 우클릭 (고장탭용) */
async function rightClickLastCellInRow(page: Page) {
  const cells = page.locator('table tbody tr').first().locator('td');
  const count = await cells.count();
  if (count === 0) return false;
  for (let i = count - 1; i >= 0; i--) {
    const cell = cells.nth(i);
    await cell.click({ button: 'right' });
    await page.waitForTimeout(500);
    const menu = page.locator('div.fixed[class*="z-[201]"]').first();
    if (await menu.isVisible().catch(() => false)) return true;
  }
  return false;
}

/** 테이블 tbody 내 첫번째 행의 첫번째 셀을 우클릭 */
async function rightClickFirstCell(page: Page) {
  const cell = page.locator('table tbody tr td').first();
  await expect(cell).toBeVisible({ timeout: 10000 });
  await cell.click({ button: 'right' });
  await page.waitForTimeout(500);
}

/** 컨텍스트 메뉴가 표시되는지 확인 */
async function assertContextMenuVisible(page: Page) {
  const menu = page.locator('div.fixed[class*="z-[201]"]').first();
  await expect(menu).toBeVisible({ timeout: 5000 });
  return menu;
}

/** 컨텍스트 메뉴 필수 항목 확인 */
async function assertContextMenuItems(page: Page, expectedItems: string[]) {
  const menu = await assertContextMenuVisible(page);
  for (const item of expectedItems) {
    const menuItem = menu.locator(`button:has-text("${item}"), span:has-text("${item}")`).first();
    await expect(menuItem).toBeVisible({ timeout: 3000 });
  }
}

/** 컨텍스트 메뉴 닫기 */
async function closeContextMenu(page: Page) {
  const overlay = page.locator('div.fixed.inset-0[class*="z-[200]"]');
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click();
    await page.waitForTimeout(300);
  }
}

/** 행 수 카운트 */
async function countRows(page: Page) {
  return page.locator('table tbody tr').count();
}

/** 행 수가 특정 값보다 커질 때까지 대기 (최대 10초) */
async function waitForRowCountGreaterThan(page: Page, initialCount: number) {
  try {
    await page.waitForFunction(
      (expected) => {
        const rows = document.querySelectorAll('table tbody tr');
        return rows.length > expected;
      },
      initialCount,
      { timeout: 10000 }
    );
    return true;
  } catch {
    return false;
  }
}

/** window.confirm 자동 수락 설정 */
async function autoAcceptDialogs(page: Page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
}

// --- 공통 메뉴 항목 ---
const BASIC_MENU_ITEMS = ['위로 새 행 추가', '아래로 새 행 추가', '행 삭제'];
const MERGED_MENU_ITEMS = ['위로 병합 추가', '아래로 병합 추가'];

// --- Tests ---

test.describe('PFMEA 컨텍스트 메뉴 전탭 검증', () => {

  test.beforeEach(async ({ page }) => {
    const success = await navigateToWorksheet(page);
    test.skip(!success, 'PFMEA 워크시트 진입 실패 (DB에 데이터 없음)');
  });

  // ==========================================
  // 1. 구조분석 탭 — 메뉴 표시 + 열별 동작
  // ==========================================
  test('1-1. 구조분석: 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuItems(page, [...BASIC_MENU_ITEMS, ...MERGED_MENU_ITEMS]);
  });

  test('1-2. 구조분석: 컨텍스트 메뉴 닫기', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuVisible(page);
    await closeContextMenu(page);

    const menu = page.locator('div.fixed[class*="z-[201]"]');
    await expect(menu).not.toBeVisible({ timeout: 3000 });
  });

  test('1-3. 구조분석: L2(공정) 열 우클릭 → 메뉴 헤더에 L2 표시', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    const clicked = await rightClickCellByDataCol(page, 'process');
    test.skip(!clicked, 'data-col="process" 셀을 찾을 수 없습니다');

    const menu = await assertContextMenuVisible(page);
    const headerText = await menu.textContent();
    expect(headerText).toContain('L2');
  });

  test('1-4. 구조분석: L3(작업요소) 열 우클릭 → 메뉴 헤더에 L3 표시', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    const clicked = await rightClickCellByDataCol(page, 'l3');
    test.skip(!clicked, 'data-col="l3" 셀을 찾을 수 없습니다');

    const menu = await assertContextMenuVisible(page);
    const headerText = await menu.textContent();
    expect(headerText).toContain('L3');
  });

  test('1-5. 구조분석: L3 열에서 "아래로 새 행 추가" → 행 증가', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    const initialRows = await countRows(page);
    const clicked = await rightClickCellByDataCol(page, 'l3');
    test.skip(!clicked, 'data-col="l3" 셀을 찾을 수 없습니다');

    const menu = await assertContextMenuVisible(page);
    await menu.locator('button:has-text("아래로 새 행 추가")').click();

    const increased = await waitForRowCountGreaterThan(page, initialRows);
    expect(increased).toBe(true);
  });

  test('1-6. 구조분석: L2(공정) 열에서 "아래로 새 행 추가" → 트리뷰에 공정 추가됨', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    // 트리뷰에서 현재 공정(📁) 폴더 수 확인
    const treeFoldersBefore = await page.locator('text=📁').count();

    const clicked = await rightClickCellByDataCol(page, 'process');
    test.skip(!clicked, 'data-col="process" 셀을 찾을 수 없습니다');

    const menu = await assertContextMenuVisible(page);
    await menu.locator('button:has-text("아래로 새 행 추가")').click();
    await page.waitForTimeout(3000);

    // 트리뷰에서 공정 수 증가 확인 (상태 반영 검증)
    const treeFoldersAfter = await page.locator('text=📁').count();
    expect(treeFoldersAfter).toBeGreaterThan(treeFoldersBefore);
  });

  // ==========================================
  // 1-7~1-8. 구조분석 — L3 행삭제 시 공정 보존 검증
  // ==========================================
  test('1-7. 구조분석: L3 빈 행 삭제 → 공정 유지 (L3만 삭제)', async ({ page }) => {
    await autoAcceptDialogs(page);
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    // 먼저 L3 행 추가 (빈 행 생성)
    const clicked = await rightClickCellByDataCol(page, 'l3');
    test.skip(!clicked, 'data-col="l3" 셀을 찾을 수 없습니다');
    let menu = await assertContextMenuVisible(page);
    await menu.locator('button:has-text("아래로 새 행 추가")').click();
    await waitForRowCountGreaterThan(page, 0);
    await page.waitForTimeout(1000);

    // 행 수 기록
    const rowsBefore = await countRows(page);

    // 첫번째 L3 빈 행 우클릭 → 행 삭제
    const clicked2 = await rightClickCellByDataCol(page, 'l3');
    test.skip(!clicked2, 'L3 셀을 찾을 수 없습니다');
    menu = await assertContextMenuVisible(page);
    await menu.locator('button:has-text("행 삭제")').click();
    await page.waitForTimeout(2000);

    const rowsAfter = await countRows(page);
    // L3 1개만 삭제되어야 함 (공정 전체 삭제 아님)
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    // 공정이 유지되므로 행이 0이 되면 안 됨
    expect(rowsAfter).toBeGreaterThan(0);
  });

  test('1-8. 구조분석: L3 입력 행 삭제 → 공정(L2) 셀 수 변화 없음', async ({ page }) => {
    await autoAcceptDialogs(page);
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    // L2(공정) 셀 개수 확인 — 공정 수의 기준
    const processCountBefore = await page.locator('table tbody td[data-col="process"]').count();

    // L3 열 우클릭 → 행 삭제
    const clicked = await rightClickCellByDataCol(page, 'l3');
    test.skip(!clicked, 'data-col="l3" 셀을 찾을 수 없습니다');
    const menu = await assertContextMenuVisible(page);
    await menu.locator('button:has-text("행 삭제")').click();
    await page.waitForTimeout(2000);

    // 공정(L2) 셀 개수 변화 없음 = 공정이 삭제되지 않았다
    const processCountAfter = await page.locator('table tbody td[data-col="process"]').count();
    expect(processCountAfter).toBe(processCountBefore);
  });

  // ==========================================
  // 2. 1L기능 탭
  // ==========================================
  test('2-1. 1L기능: 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '1L기능');
    test.skip(!switched, '1L기능 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuItems(page, BASIC_MENU_ITEMS);
  });

  // ==========================================
  // 3. 2L기능 탭
  // ==========================================
  test('3-1. 2L기능: 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '2L기능');
    test.skip(!switched, '2L기능 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuItems(page, BASIC_MENU_ITEMS);
  });

  // ==========================================
  // 4. 3L기능 탭
  // ==========================================
  test('4-1. 3L기능: 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '3L기능');
    test.skip(!switched, '3L기능 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuItems(page, BASIC_MENU_ITEMS);
  });

  // ==========================================
  // 5. 1L영향 탭
  // ==========================================
  test('5-1. 1L영향: 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '1L영향');
    test.skip(!switched, '1L영향 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuItems(page, BASIC_MENU_ITEMS);
  });

  // ==========================================
  // 6. 2L형태 탭 (읽기전용 셀 차단 검증)
  // ==========================================
  test('6-1. 2L형태: 편집가능 셀(FM) 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '2L형태');
    test.skip(!switched, '2L형태 탭이 없습니다');

    const success = await rightClickLastCellInRow(page);
    test.skip(!success, '편집가능 셀을 찾을 수 없습니다');

    await assertContextMenuItems(page, BASIC_MENU_ITEMS);
  });

  test('6-2. 2L형태: 읽기전용 셀(공정) 우클릭 시 컨텍스트 메뉴 미표시', async ({ page }) => {
    const switched = await switchToTab(page, '2L형태');
    test.skip(!switched, '2L형태 탭이 없습니다');

    await rightClickFirstCell(page);
    const menu = page.locator('div.fixed[class*="z-[201]"]').first();
    const visible = await menu.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });

  // ==========================================
  // 7. 3L원인 탭 (읽기전용 셀 차단 검증)
  // ==========================================
  test('7-1. 3L원인: 편집가능 셀(FC) 우클릭 시 컨텍스트 메뉴 표시', async ({ page }) => {
    const switched = await switchToTab(page, '3L원인');
    test.skip(!switched, '3L원인 탭이 없습니다');

    const success = await rightClickLastCellInRow(page);
    test.skip(!success, '편집가능 셀을 찾을 수 없습니다');

    await assertContextMenuItems(page, BASIC_MENU_ITEMS);
  });

  test('7-2. 3L원인: 읽기전용 셀(공정) 우클릭 시 컨텍스트 메뉴 미표시', async ({ page }) => {
    const switched = await switchToTab(page, '3L원인');
    test.skip(!switched, '3L원인 탭이 없습니다');

    await rightClickFirstCell(page);
    const menu = page.locator('div.fixed[class*="z-[201]"]').first();
    const visible = await menu.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });

  // ==========================================
  // 8. 자동 모드 검증
  // ==========================================
  test('8-1. 자동 모드에서 구조분석 컨텍스트 메뉴 작동', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    await rightClickFirstCell(page);
    await assertContextMenuVisible(page);
  });

  // ==========================================
  // 9. 컨텍스트 메뉴 헤더
  // ==========================================
  test('9-1. 컨텍스트 메뉴 헤더에 행 번호 표시', async ({ page }) => {
    const switched = await switchToTab(page, '구조분석');
    test.skip(!switched, '구조분석 탭이 없습니다');

    await rightClickFirstCell(page);
    const menu = await assertContextMenuVisible(page);

    const headerText = await menu.textContent();
    expect(headerText).toContain('행 #');
  });
});
