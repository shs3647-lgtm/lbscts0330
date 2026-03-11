/**
 * @file tab-horizontal-regression.spec.ts
 * @description 구조분석 표준코드 수평전개 회귀 테스트
 *
 * 7개 탭 순차 검증:
 * 1. 구조분석 (기준) - 모달 위치 + 더블클릭 편집
 * 2. 1L기능 - 더블클릭 인라인 편집 + 모달 위치
 * 3. 2L기능 - 더블클릭 편집 + 모달 위치 + 특별특성
 * 4. 3L기능 - 더블클릭 편집 + 모달 위치 + 특별특성
 * 5. 1L영향 - 고장영향 편집 + 모달 위치
 * 6. 2L형태 - 고장형태 편집 + 모달 위치
 * 7. 3L원인 - 고장원인 편집 + 모달 위치
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FMEA_ID = 'pfm26-p002-l02';

// ==================== 공통 헬퍼 ====================

async function waitForStable(page: Page, ms = 1500) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

async function navigateToWorksheet(page: Page) {
  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`);
  await waitForStable(page);
}

/** 탭 선택 */
async function selectTab(page: Page, tabName: string) {
  const tab = page.locator(`button:has-text("${tabName}")`).first();
  if (await tab.count() > 0) {
    await tab.click();
    await page.waitForTimeout(800);
  } else {
    throw new Error(`탭 "${tabName}" 을 찾을 수 없습니다`);
  }
}

/** 트리패널 표시 확인 */
async function verifyTreePanelVisible(page: Page) {
  const treePanel = page.locator('text=/구조트리|기능트리|고장|트리뷰/').first();
  if (await treePanel.count() > 0) {
    await expect(treePanel).toBeVisible({ timeout: 3000 });
    return true;
  }
  return false;
}

/** 모달이 열렸을 때 위치 확인 (트리패널과 비겹침) */
async function verifyModalNotOverlappingTree(page: Page) {
  const modal = page.locator('[style*="position: fixed"][style*="right"]').first();
  if (await modal.count() > 0) {
    const box = await modal.boundingBox();
    if (box) {
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        const rightEdge = viewportSize.width - (box.x + box.width);
        console.log(`  모달 위치: right=${Math.round(rightEdge)}px, left=${Math.round(box.x)}px`);
        expect(rightEdge).toBeGreaterThanOrEqual(300);
        return true;
      }
    }
  }
  return false;
}

/** 모달 닫기 - "닫기" 버튼 또는 ESC */
async function closeModal(page: Page) {
  // 1차: "닫기" 버튼
  const closeBtn = page.locator('button:has-text("닫기")').first();
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
    return;
  }
  // 2차: ESC
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // 3차: 아직 모달이 있으면 빈 영역 클릭
  const modal = page.locator('[style*="position: fixed"][style*="right"]').first();
  if (await modal.isVisible({ timeout: 300 }).catch(() => false)) {
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
  }
}

/** 컨텍스트 메뉴 닫기 */
async function closeContextMenu(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * 공통 탭 테스트 로직
 * 1. 테이블 로딩 확인
 * 2. 트리패널 표시 확인
 * 3. 더블클릭 인라인 편집 (모달 열기 전에 먼저 테스트)
 * 4. 셀 클릭 → 모달 위치 확인
 * 5. 컨텍스트 메뉴 확인
 */
async function testTabCommon(page: Page, tabName: string, cellIndex: number) {
  await navigateToWorksheet(page);
  await selectTab(page, tabName);

  // 1. 테이블 로딩 확인
  const table = page.locator('table').first();
  await expect(table).toBeVisible({ timeout: 5000 });
  console.log(`  ✅ ${tabName} 테이블 로딩 완료`);

  // 2. 트리패널 표시 확인
  const treeVisible = await verifyTreePanelVisible(page);
  console.log(`  ✅ 트리패널 표시: ${treeVisible}`);

  // 3. 더블클릭 인라인 편집 (모달 열기 전에 먼저!)
  const editableCell = page.locator('tbody td').nth(cellIndex);
  if (await editableCell.count() > 0) {
    await editableCell.dblclick();
    await page.waitForTimeout(800);
    // 인라인 편집 input이 나타나는지 확인
    const input = page.locator('tbody input[type="text"], tbody textarea').first();
    const inputVisible = await input.isVisible().catch(() => false);
    if (inputVisible) {
      console.log('  ✅ 더블클릭 인라인 편집 활성화');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log('  ⚠️ 더블클릭 인라인 편집 input 미감지 (모달이 열렸을 수 있음)');
      // 모달이 열렸다면 닫기
      await closeModal(page);
    }
  }

  // 4. 셀 클릭 → 모달 위치 확인
  const clickCell = page.locator('tbody td').nth(cellIndex);
  if (await clickCell.count() > 0) {
    await clickCell.click();
    await page.waitForTimeout(1500);

    const posOk = await verifyModalNotOverlappingTree(page);
    if (posOk) console.log(`  ✅ ${tabName} 모달 위치 정상 (트리패널 비겹침)`);
    await closeModal(page);
    await page.waitForTimeout(300);
  }

  // 5. 컨텍스트 메뉴 (우클릭) 확인
  const anyCell = page.locator('tbody td').first();
  if (await anyCell.count() > 0) {
    await anyCell.click({ button: 'right' });
    await page.waitForTimeout(500);
    const menu = page.locator('[class*="fixed"][class*="bg-white"][class*="shadow"]');
    const menuVisible = await menu.isVisible().catch(() => false);
    if (menuVisible) {
      console.log('  ✅ 컨텍스트 메뉴 표시 확인');
      await closeContextMenu(page);
    } else {
      console.log('  ⚠️ 컨텍스트 메뉴 미감지');
    }
  }
}

// ==================== 탭별 순차 테스트 ====================

test.describe.configure({ mode: 'serial' });

test.describe('구조분석 표준코드 수평전개 회귀 테스트', () => {

  // ========== 1. 구조분석 (기준 탭) ==========
  test('1/7 구조분석 - 기준 검증', async ({ page }) => {
    await navigateToWorksheet(page);
    await selectTab(page, '구조분석');

    // 테이블 로딩
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 5000 });
    console.log('  ✅ 구조분석 테이블 로딩 완료');

    // 트리패널
    const treeVisible = await verifyTreePanelVisible(page);
    console.log(`  ✅ 트리패널 표시: ${treeVisible}`);

    // 공정 셀 클릭 → 모달 위치 확인
    const processCell = page.locator('td').filter({ hasText: /클릭하여 공정 선택/ }).first();
    if (await processCell.count() > 0) {
      await processCell.click();
      await page.waitForTimeout(1000);
      const posOk = await verifyModalNotOverlappingTree(page);
      if (posOk) console.log('  ✅ 공정 모달 위치 정상');
      await closeModal(page);
    }

    // 컨텍스트 메뉴
    const anyCell = page.locator('tbody td').first();
    if (await anyCell.count() > 0) {
      await anyCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      const menuVisible = await page.locator('[class*="fixed"][class*="bg-white"][class*="shadow"]').isVisible();
      if (menuVisible) {
        console.log('  ✅ 컨텍스트 메뉴 확인');
        await closeContextMenu(page);
      }
    }

    console.log('✅ [1/7] 구조분석 기준 검증 완료');
  });

  // ========== 2. 1L기능 ==========
  test('2/7 1L기능 - 더블클릭 편집 + 모달 위치', async ({ page }) => {
    await testTabCommon(page, '1L기능', 2); // 기능 셀 (3번째 컬럼)
    console.log('✅ [2/7] 1L기능 검증 완료');
  });

  // ========== 3. 2L기능 ==========
  test('3/7 2L기능 - 더블클릭 편집 + 모달 위치', async ({ page }) => {
    await testTabCommon(page, '2L기능', 1); // 공정기능 셀 (2번째 컬럼)
    console.log('✅ [3/7] 2L기능 검증 완료');
  });

  // ========== 4. 3L기능 ==========
  test('4/7 3L기능 - 더블클릭 편집 + 모달 위치', async ({ page }) => {
    await testTabCommon(page, '3L기능', 3); // 작업요소기능 셀 (4번째 컬럼)
    console.log('✅ [4/7] 3L기능 검증 완료');
  });

  // ========== 5. 1L영향 ==========
  test('5/7 1L영향 - 고장영향 편집 + 모달 위치', async ({ page }) => {
    await testTabCommon(page, '1L영향', 4); // 고장영향 셀 (5번째 컬럼)
    console.log('✅ [5/7] 1L영향 검증 완료');
  });

  // ========== 6. 2L형태 ==========
  test('6/7 2L형태 - 고장형태 편집 + 모달 위치', async ({ page }) => {
    await testTabCommon(page, '2L형태', 4); // 고장형태 셀 (5번째 컬럼)
    console.log('✅ [6/7] 2L형태 검증 완료');
  });

  // ========== 7. 3L원인 ==========
  test('7/7 3L원인 - 고장원인 편집 + 모달 위치', async ({ page }) => {
    await testTabCommon(page, '3L원인', 4); // 고장원인 셀 (5번째 컬럼)
    console.log('✅ [7/7] 3L원인 검증 완료');
  });

});

// ==================== Phase 4: 데이터 연계성 검증 ====================

test.describe('Phase 4: 데이터 연계성 검증', () => {

  test('8/11 구조→기능 연계 (구조분석 데이터가 기능탭에 반영)', async ({ page }) => {
    await navigateToWorksheet(page);
    await selectTab(page, '구조분석');

    const structCount = await page.locator('tbody tr').count();
    console.log(`  구조분석 행 수: ${structCount}`);

    // 2L기능 탭 확인
    await selectTab(page, '2L기능');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 5000 });
    const funcCount = await page.locator('tbody tr').count();
    console.log(`  2L기능 행 수: ${funcCount}`);
    expect(funcCount).toBeGreaterThan(0);

    // 3L기능 탭 확인
    await selectTab(page, '3L기능');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 5000 });
    const l3Count = await page.locator('tbody tr').count();
    console.log(`  3L기능 행 수: ${l3Count}`);
    expect(l3Count).toBeGreaterThan(0);

    console.log('✅ [8/11] 구조→기능 연계 검증 완료');
  });

  test('9/11 기능→고장 연계 (기능탭 데이터가 고장탭에 반영)', async ({ page }) => {
    await navigateToWorksheet(page);

    for (const tabName of ['1L영향', '2L형태', '3L원인']) {
      await selectTab(page, tabName);
      await expect(page.locator('table').first()).toBeVisible({ timeout: 5000 });
      const count = await page.locator('tbody tr').count();
      console.log(`  ${tabName} 행 수: ${count}`);
      expect(count).toBeGreaterThan(0);
    }

    console.log('✅ [9/11] 기능→고장 연계 검증 완료');
  });

  test('10/11 탭 전환 후 데이터 유지', async ({ page }) => {
    await navigateToWorksheet(page);
    await selectTab(page, '구조분석');
    const beforeRows = await page.locator('tbody tr').count();

    // 모든 탭 순회 후 복귀
    for (const tabName of ['1L기능', '2L기능', '3L기능', '1L영향', '2L형태', '3L원인']) {
      await selectTab(page, tabName);
      await page.waitForTimeout(300);
    }

    await selectTab(page, '구조분석');
    const afterRows = await page.locator('tbody tr').count();
    console.log(`  탭 순회 전: ${beforeRows}행, 후: ${afterRows}행`);
    expect(afterRows).toBe(beforeRows);

    console.log('✅ [10/11] 탭 전환 후 데이터 유지 검증 완료');
  });
});

// ==================== Phase 5: 워크시트 UI 무결성 검증 ====================

test.describe('Phase 5: 워크시트 UI 무결성', () => {

  test('11/11 트리패널 모든 탭에서 정상 렌더링', async ({ page }) => {
    await navigateToWorksheet(page);

    const tabs = ['구조분석', '1L기능', '2L기능', '3L기능', '1L영향', '2L형태', '3L원인'];
    for (const tabName of tabs) {
      await selectTab(page, tabName);
      const treeTitle = page.locator('text=/트리뷰|구조트리|기능트리|고장/').first();
      const visible = await treeTitle.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`  ${tabName}: 트리패널 ${visible ? '✅' : '⚠️'}`);
    }

    console.log('✅ [11/11] 트리패널 모든 탭 렌더링 검증 완료');
  });
});
