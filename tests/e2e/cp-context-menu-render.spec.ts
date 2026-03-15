/**
 * @file cp-context-menu-render.spec.ts
 * @description CP 워크시트 컨텍스트 메뉴 브라우저 렌더링 E2E 테스트
 *
 * 검증:
 * 1. CP 워크시트 페이지 정상 로드 + 테이블 렌더링
 * 2. 셀 우클릭 시 컨텍스트 메뉴 표시
 * 3. 컨텍스트 메뉴에 행 추가(위/아래)/삭제/Undo/Redo 항목 존재
 * 4. 행 추가 후 실제 행 수 증가 확인
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_CP_NO = 'cp26-p013-l70';

test.describe('CP 워크시트 컨텍스트 메뉴 렌더링', () => {

  test('1. CP 워크시트 페이지 정상 로드 + 테이블 렌더링', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    // 테이블이 보일 때까지 대기
    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 테이블 행이 존재하는지 확인
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('2. 공정번호 셀 우클릭 시 컨텍스트 메뉴 표시 + 행 추가 버튼 확인', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 공정번호(A열) 셀 찾기 - "10" 텍스트가 있는 셀
    // 렌더러에서 processNo 셀에 onContextMenu가 바인딩됨
    const processNoCell = page.locator('table tbody tr td').filter({ hasText: '10' }).first();
    await expect(processNoCell).toBeVisible({ timeout: 5000 });

    // 우클릭 전 브라우저 기본 컨텍스트 메뉴 방지
    await processNoCell.click({ button: 'right' });

    // 컨텍스트 메뉴: '위로 행 추가' 텍스트가 포함된 버튼 찾기
    // Tailwind v4에서는 CSS class selector 대신 텍스트 기반으로 찾기
    const insertAbove = page.locator('button', { hasText: '위로 행 추가' });
    await expect(insertAbove).toBeVisible({ timeout: 5000 });

    const insertBelow = page.locator('button', { hasText: '아래로 행 추가' });
    await expect(insertBelow).toBeVisible();

    const deleteRow = page.locator('button', { hasText: '행 삭제' });
    await expect(deleteRow).toBeVisible();

    const undo = page.locator('button', { hasText: '실행취소' });
    await expect(undo).toBeVisible();

    const redo = page.locator('button', { hasText: '다시실행' });
    await expect(redo).toBeVisible();
  });

  test('3. 행 추가 클릭 후 행이 실제로 추가됨', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 초기 항목 수 확인 ("총 N개 항목" 텍스트)
    const totalText = page.locator('text=/총 \\d+개 항목/');
    await expect(totalText).toBeVisible({ timeout: 5000 });
    const initialText = await totalText.textContent() || '';
    const initialCount = parseInt(initialText.match(/\d+/)?.[0] || '0');

    // 공정번호 셀 우클릭
    const processNoCell = page.locator('table tbody tr td').filter({ hasText: '10' }).first();
    await processNoCell.click({ button: 'right' });

    // "아래로 행 추가" 클릭
    const insertBelow = page.locator('button', { hasText: '아래로 행 추가' });
    await expect(insertBelow).toBeVisible({ timeout: 5000 });
    await insertBelow.click();

    // 항목 수가 1개 증가했는지 확인
    await page.waitForTimeout(1000);
    const newText = await totalText.textContent() || '';
    const newCount = parseInt(newText.match(/\d+/)?.[0] || '0');
    expect(newCount).toBe(initialCount + 1);
  });

  test('4. 메뉴 외부 클릭 시 닫힘', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 우클릭으로 메뉴 열기
    const processNoCell = page.locator('table tbody tr td').filter({ hasText: '10' }).first();
    await processNoCell.click({ button: 'right' });

    const menuButton = page.locator('button', { hasText: '위로 행 추가' });
    await expect(menuButton).toBeVisible({ timeout: 5000 });

    // 배경 오버레이 (z-[200]) 클릭으로 메뉴 닫기
    // CPContextMenu에서 fixed inset-0 z-[200] 배경을 클릭하면 onClose 호출
    const backdrop = page.locator('div.fixed.inset-0').first();
    await backdrop.click({ force: true });

    // 메뉴가 사라졌는지 확인
    await expect(menuButton).not.toBeVisible({ timeout: 3000 });
  });

  test('P-01. general 컬럼(스펙/공차) 우클릭 시 행 추가 메뉴 표시 (회귀 방지)', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 스펙/공차(L열) 셀 찾기 — 헤더에 "스펙/공차" 텍스트가 있는 th의 getBoundingClientRect().x를 기준으로
    // 같은 x 좌표 범위에 있는 tbody td를 클릭
    const specHeader = page.locator('th', { hasText: '스펙/공차' }).first();
    await expect(specHeader).toBeVisible({ timeout: 5000 });

    const headerBox = await specHeader.boundingBox();
    expect(headerBox).not.toBeNull();

    // 헤더 중심 x 좌표 계산
    const centerX = headerBox!.x + headerBox!.width / 2;

    // 첫 번째 데이터 행(rowSpan 관계 없이)에서 해당 x 좌표의 셀을 클릭
    // tbody의 두 번째 tr (첫 번째 tr은 rowSpan으로 셀이 적을 수 있음)
    const firstDataRow = page.locator('table tbody tr').nth(0);
    const firstRowBox = await firstDataRow.boundingBox();
    expect(firstRowBox).not.toBeNull();

    // 해당 행의 세로 중심 + 헤더의 가로 중심에서 우클릭
    const clickY = firstRowBox!.y + firstRowBox!.height / 2;
    await page.mouse.click(centerX, clickY, { button: 'right' });

    // general 타입에서도 행 추가 메뉴가 표시되어야 함 (이전 버그: isSpecialColumn에 general 누락)
    const insertAbove = page.locator('button', { hasText: '위로 행 추가' });
    await expect(insertAbove).toBeVisible({ timeout: 5000 });

    const insertBelow = page.locator('button', { hasText: '아래로 행 추가' });
    await expect(insertBelow).toBeVisible();

    // 메뉴 라벨에 "일반" 텍스트가 있는지 확인 (📝 일반)
    const menuLabel = page.locator('text=일반');
    await expect(menuLabel).toBeVisible({ timeout: 3000 });

    // 메뉴 닫기
    const backdrop = page.locator('div.fixed.inset-0').first();
    await backdrop.click({ force: true });
    await expect(insertAbove).not.toBeVisible({ timeout: 3000 });
  });

  test('P-02. 행 추가 → 저장 → 새로고침 → 데이터 유지 (전체 E2E 흐름)', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 초기 항목 수 파싱
    const totalText = page.locator('text=/총 \\d+개 항목/');
    await expect(totalText).toBeVisible({ timeout: 5000 });
    const initialText = await totalText.textContent() || '';
    const initialCount = parseInt(initialText.match(/\d+/)?.[0] || '0');
    expect(initialCount).toBeGreaterThan(0);

    // 공정번호 셀 우클릭 → "아래로 행 추가"
    const processNoCell = page.locator('table tbody tr td').filter({ hasText: '10' }).first();
    await processNoCell.click({ button: 'right' });

    const insertBelow = page.locator('button', { hasText: '아래로 행 추가' });
    await expect(insertBelow).toBeVisible({ timeout: 5000 });
    await insertBelow.click();

    // 항목 수가 1 증가 확인
    await page.waitForTimeout(500);
    const afterAddText = await totalText.textContent() || '';
    const afterAddCount = parseInt(afterAddText.match(/\d+/)?.[0] || '0');
    expect(afterAddCount).toBe(initialCount + 1);

    // 자동저장 대기 — "저장됨" 또는 "저장완료" 또는 "Saved" 텍스트 확인
    const savedIndicator = page.locator('text=/저장됨|저장완료|저장 완료|Saved/');
    await expect(savedIndicator).toBeVisible({ timeout: 10000 });

    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 테이블 재로드 대기
    await expect(table.first()).toBeVisible({ timeout: 30000 });
    await expect(totalText).toBeVisible({ timeout: 5000 });

    // 새로고침 후에도 행 수 유지 확인
    const afterReloadText = await totalText.textContent() || '';
    const afterReloadCount = parseInt(afterReloadText.match(/\d+/)?.[0] || '0');
    expect(afterReloadCount).toBe(initialCount + 1);
  });

  test('P-03. 행 삭제 후 행 수 감소 확인', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // 초기 항목 수 파싱
    const totalText = page.locator('text=/총 \\d+개 항목/');
    await expect(totalText).toBeVisible({ timeout: 5000 });
    const initialText = await totalText.textContent() || '';
    const initialCount = parseInt(initialText.match(/\d+/)?.[0] || '0');
    expect(initialCount).toBeGreaterThan(0);

    // 공정번호 셀 우클릭 → "행 삭제"
    const processNoCell = page.locator('table tbody tr td').filter({ hasText: '10' }).first();
    await processNoCell.click({ button: 'right' });

    const deleteRow = page.locator('button', { hasText: '행 삭제' });
    await expect(deleteRow).toBeVisible({ timeout: 5000 });
    await deleteRow.click();

    // 행 삭제 반영 대기
    await page.waitForTimeout(500);

    // 항목 수가 1 감소 확인
    const afterDeleteText = await totalText.textContent() || '';
    const afterDeleteCount = parseInt(afterDeleteText.match(/\d+/)?.[0] || '0');
    expect(afterDeleteCount).toBe(initialCount - 1);
  });

  test('P-04. 타입별 컨텍스트 메뉴 라벨 확인 (process, work)', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/worksheet?cpNo=${TEST_CP_NO}`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 30000 });

    // --- (1) process 타입: 공정번호("10") 셀 우클릭 → "공정설명 기준" 라벨 확인 ---
    const processNoCell = page.locator('table tbody tr td').filter({ hasText: '10' }).first();
    await processNoCell.click({ button: 'right' });

    const processLabel = page.locator('text=공정설명 기준');
    await expect(processLabel).toBeVisible({ timeout: 5000 });

    // 메뉴 닫기
    const backdrop = page.locator('div.fixed.inset-0').first();
    await backdrop.click({ force: true });
    const menuCheck = page.locator('button', { hasText: '위로 행 추가' });
    await expect(menuCheck).not.toBeVisible({ timeout: 3000 });

    // --- (2) work 타입: equipment(설비/금형/JIG) 셀 우클릭 → "설비/금형/JIG 기준" 라벨 확인 ---
    // 헤더에서 "설비/금형/JIG" 텍스트가 있는 th의 bounding box 중심 x를 기준으로 tbody 셀 클릭
    const equipHeader = page.locator('th', { hasText: '설비/금형/JIG' }).first();
    const equipHeaderVisible = await equipHeader.isVisible({ timeout: 10000 }).catch(() => false);

    if (equipHeaderVisible) {
      const eqBox = await equipHeader.boundingBox();
      expect(eqBox).not.toBeNull();

      const eqCenterX = eqBox!.x + eqBox!.width / 2;

      // 두 번째 데이터 행(첫 행은 빈 행일 수 있으므로) 세로 중심에서 클릭
      // "ss-01" 텍스트가 있는 행 (설비 데이터가 있는 행)
      const equipDataCell = page.locator('table tbody tr td').filter({ hasText: 'ss-01' }).first();
      const equipDataVisible = await equipDataCell.isVisible({ timeout: 5000 }).catch(() => false);

      if (equipDataVisible) {
        const cellBox = await equipDataCell.boundingBox();
        const clickY = cellBox!.y + cellBox!.height / 2;
        await page.mouse.click(eqCenterX, clickY, { button: 'right' });

        const workLabel = page.locator('text=설비/금형/JIG 기준');
        await expect(workLabel).toBeVisible({ timeout: 5000 });

        // 메뉴 닫기
        await page.locator('div.fixed.inset-0').first().click({ force: true });
        await expect(menuCheck).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});
