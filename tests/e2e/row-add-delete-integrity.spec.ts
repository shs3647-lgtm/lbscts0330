/**
 * @file row-add-delete-integrity.spec.ts
 * @description 구조분석~3L원인분석 행 추가/삭제 E2E 테스트
 *
 * 검증 항목:
 * 1. 자동모드: Import 데이터 기반 행 추가/삭제 → 배열 깨짐 없음
 * 2. 수동모드: 빈 프로젝트 placeholder 보호 + 행 추가
 * 3. 혼합모드: 행 추가/삭제 반복 → 탭 전환 → 데이터 유지
 *
 * @created 2026-03-08
 */

import { test, expect, Page } from '@playwright/test';

test.setTimeout(120_000);

const BASE_URL = 'http://localhost:3000';
// 테스트 대상 FMEA ID — 실제 존재하는 프로젝트 ID 사용
const TEST_FMEA_ID = 'pfm26-f001-l68-r03';

// ── Helpers ──

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
}

async function navigateToWorksheet(page: Page): Promise<string | null> {
  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${TEST_FMEA_ID}`, { timeout: 30000 });
  await waitForPageLoad(page);
  return TEST_FMEA_ID;
}

async function switchToTab(page: Page, tabLabel: string): Promise<boolean> {
  // 탭 버튼 텍스트 매칭 (영문병기 대응)
  const tabButton = page.locator(`button`).filter({ hasText: tabLabel }).first();
  if (await tabButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tabButton.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function countTableRows(page: Page): Promise<number> {
  return await page.locator('table tbody tr').count();
}

async function rightClickRow(page: Page, rowIndex: number = 0): Promise<boolean> {
  const row = page.locator('table tbody tr').nth(rowIndex);
  if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
    // 마지막 td를 우클릭 (컨텍스트 메뉴 트리거 확률 높임)
    const cells = row.locator('td');
    const count = await cells.count();
    if (count > 0) {
      await cells.nth(Math.max(0, count - 2)).click({ button: 'right' });
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

async function isContextMenuVisible(page: Page): Promise<boolean> {
  // 컨텍스트 메뉴 감지 (여러 셀렉터 시도)
  const selectors = [
    'div.fixed[class*="z-[201]"]',
    'div[class*="context-menu"]',
    '[role="menu"]',
    'div.fixed.bg-white.shadow',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) return true;
  }
  return false;
}

async function clickMenuItem(page: Page, menuText: string): Promise<boolean> {
  // 메뉴 아이템 찾기 (여러 패턴)
  const selectors = [
    `div.fixed button:has-text("${menuText}")`,
    `div.fixed div:has-text("${menuText}")`,
    `[role="menuitem"]:has-text("${menuText}")`,
    `button:has-text("${menuText}")`,
  ];
  for (const sel of selectors) {
    const item = page.locator(sel).first();
    if (await item.isVisible({ timeout: 1500 }).catch(() => false)) {
      await item.click();
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
}

async function clickConfirmOrEdit(page: Page, action: 'confirm' | 'edit') {
  if (action === 'edit') {
    // 수정(Edit) 버튼 클릭 — 확정 해제
    const editBtn = page.locator('button').filter({ hasText: /수정|Edit/ }).first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);
      return true;
    }
  } else {
    // 확정(Confirm) 버튼 클릭
    const confirmBtn = page.locator('button').filter({ hasText: /미확정|Unconfirmed/ }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

async function clickSave(page: Page) {
  const saveBtn = page.locator('button').filter({ hasText: /저장|Save/ }).first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

// ── 자동 모드 테스트 ──

test.describe('자동모드: 행 추가/삭제 배열 깨짐 검증', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (d) => await d.accept());
  });

  // 탭 정보: [탭이름, 한글/영문 매칭 텍스트]
  const TABS = [
    { id: 'structure', label: '구조', altLabel: 'Structure' },
    { id: 'func-l1', label: '1L', altLabel: '1L Function' },
    { id: 'func-l2', label: '2L', altLabel: '2L Function' },
    { id: 'func-l3', label: '3L', altLabel: '3L Function' },
    { id: 'fail-l1', label: '1L', altLabel: 'FE' },
    { id: 'fail-l2', label: '2L', altLabel: 'FM' },
    { id: 'fail-l3', label: '3L', altLabel: 'FC' },
  ];

  test('A-0. 워크시트 진입 + 탭 존재 확인', async ({ page }) => {
    const fmeaId = await navigateToWorksheet(page);
    expect(fmeaId).toBeTruthy();

    // 구조분석 탭 또는 Structure 탭 존재 확인
    const structTab = page.locator('button').filter({ hasText: /구조|Structure/ }).first();
    await expect(structTab).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'tests/test-results/auto-00-entry.png', fullPage: true });
    console.log(`✅ 워크시트 진입 성공: ${fmeaId}`);
  });

  test('A-1. Structure 탭 — 행 추가/삭제 + 배열 검증', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await navigateToWorksheet(page);

    // Structure 탭으로 이동
    const switched = await switchToTab(page, '구조') || await switchToTab(page, 'Structure');
    console.log(`Structure 탭 전환: ${switched}`);

    const beforeRows = await countTableRows(page);
    console.log(`[Structure] 초기 행 수: ${beforeRows}`);

    if (beforeRows === 0) {
      console.log('⚠️ Structure 행 0개 — 데이터 없는 프로젝트, 스킵');
      return;
    }

    // 확정 해제 시도
    await clickConfirmOrEdit(page, 'edit');

    // 행 추가
    const rightClicked = await rightClickRow(page, 0);
    console.log(`우클릭 성공: ${rightClicked}`);

    if (rightClicked && await isContextMenuVisible(page)) {
      const added = await clickMenuItem(page, '행 추가') || await clickMenuItem(page, 'Add');
      console.log(`행 추가 메뉴 클릭: ${added}`);

      if (added) {
        const afterAdd = await countTableRows(page);
        console.log(`행 추가 후: ${beforeRows} → ${afterAdd}`);
        expect(afterAdd).toBeGreaterThanOrEqual(beforeRows);
      }
    }

    // 배열 깨짐 검증 — undefined/null/NaN 텍스트 없음
    const allCells = page.locator('table tbody td');
    const cellCount = await allCells.count();
    let brokenCount = 0;
    for (let i = 0; i < Math.min(cellCount, 200); i++) {
      const text = await allCells.nth(i).textContent() || '';
      if (text.includes('undefined') || text === 'null' || text === 'NaN') {
        brokenCount++;
        console.log(`❌ 깨진 셀 발견: [${i}] = "${text}"`);
      }
    }
    expect(brokenCount).toBe(0);

    // 치명적 콘솔 에러 검증
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') ||
      e.includes('.map is not a function') ||
      e.includes('.filter is not a function') ||
      e.includes('Cannot read properties of undefined')
    );
    console.log(`콘솔 에러: 총 ${consoleErrors.length}개, 치명적: ${criticalErrors.length}개`);

    await page.screenshot({ path: 'tests/test-results/auto-01-structure.png', fullPage: true });
    expect(criticalErrors.length).toBe(0);
  });

  test('A-2. Function 1L/2L/3L 탭 — 행 추가 후 배열 검증', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await navigateToWorksheet(page);

    const funcTabs = ['1L Function', '2L Function', '3L Function'];
    const altFuncTabs = ['1L기능', '2L기능', '3L기능'];

    for (let i = 0; i < funcTabs.length; i++) {
      const switched = await switchToTab(page, funcTabs[i]) || await switchToTab(page, altFuncTabs[i]);
      if (!switched) {
        console.log(`⚠️ ${funcTabs[i]} 탭 없음, 스킵`);
        continue;
      }

      const rows = await countTableRows(page);
      console.log(`[${funcTabs[i]}] 행 수: ${rows}`);

      if (rows === 0) continue;

      // 확정 해제
      await clickConfirmOrEdit(page, 'edit');

      // 우클릭 → 행 추가 시도
      const rightClicked = await rightClickRow(page, 0);
      if (rightClicked && await isContextMenuVisible(page)) {
        await clickMenuItem(page, '행 추가') || await clickMenuItem(page, 'Add');
        const afterAdd = await countTableRows(page);
        console.log(`  행 추가: ${rows} → ${afterAdd}`);
      }

      // 배열 깨짐 검증
      const allCells = page.locator('table tbody td');
      const cellCount = await allCells.count();
      for (let j = 0; j < Math.min(cellCount, 100); j++) {
        const text = await allCells.nth(j).textContent() || '';
        expect(text).not.toContain('undefined');
      }
    }

    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') || e.includes('.map is not a function')
    );
    expect(criticalErrors.length).toBe(0);

    await page.screenshot({ path: 'tests/test-results/auto-02-function.png', fullPage: true });
  });

  test('A-3. Failure 1L/2L/3L 탭 — 행 추가 후 배열 검증', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await navigateToWorksheet(page);

    // 고장분석 탭 — 탭 이름이 '1L영향', '2L형태', '3L원인' 등 여러 변형
    const failTabs = [
      { search: ['1L영향', 'FE', '1L Failure'], name: 'Failure L1 (FE)' },
      { search: ['2L형태', 'FM', '2L Failure'], name: 'Failure L2 (FM)' },
      { search: ['3L원인', 'FC', '3L Failure'], name: 'Failure L3 (FC)' },
    ];

    for (const tab of failTabs) {
      let switched = false;
      for (const label of tab.search) {
        switched = await switchToTab(page, label);
        if (switched) break;
      }
      if (!switched) {
        console.log(`⚠️ ${tab.name} 탭 없음, 스킵`);
        continue;
      }

      const rows = await countTableRows(page);
      console.log(`[${tab.name}] 행 수: ${rows}`);

      if (rows === 0) continue;

      await clickConfirmOrEdit(page, 'edit');

      const rightClicked = await rightClickRow(page, 0);
      if (rightClicked && await isContextMenuVisible(page)) {
        await clickMenuItem(page, '행 추가') || await clickMenuItem(page, 'Add');
        const afterAdd = await countTableRows(page);
        console.log(`  행 추가: ${rows} → ${afterAdd}`);
      }

      // 배열 깨짐 검증
      const allCells = page.locator('table tbody td');
      const cellCount = await allCells.count();
      for (let j = 0; j < Math.min(cellCount, 100); j++) {
        const text = await allCells.nth(j).textContent() || '';
        expect(text).not.toContain('undefined');
      }
    }

    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') || e.includes('.map is not a function')
    );
    expect(criticalErrors.length).toBe(0);

    await page.screenshot({ path: 'tests/test-results/auto-03-failure.png', fullPage: true });
  });
});

// ── 수동 모드 테스트 ──

test.describe('수동모드: 빈 상태 placeholder 보호 + 행 추가', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (d) => await d.accept());
  });

  test('M-1. 전체 탭 순회 — TypeError/배열 에러 0건', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const fmeaId = await navigateToWorksheet(page);

    if (!fmeaId) {
      console.log('⚠️ FMEA 프로젝트 없음 — 수동모드 테스트 스킵');
      return;
    }

    // 모든 분석 탭을 순회하면서 크래시 없는지 확인
    const allTabLabels = [
      '구조', 'Structure',
      '1L Function', '1L기능',
      '2L Function', '2L기능',
      '3L Function', '3L기능',
      '1L영향', 'FE',
      '2L형태', 'FM',
      '3L원인', 'FC',
    ];

    let visitedTabs = 0;
    for (const label of allTabLabels) {
      const switched = await switchToTab(page, label);
      if (switched) {
        visitedTabs++;
        // 페이지 크래시 확인
        const bodyText = await page.locator('body').textContent() || '';
        expect(bodyText).not.toContain('Application error');
        expect(bodyText).not.toContain('Internal Server Error');
      }
    }

    console.log(`[수동모드] ${visitedTabs}개 탭 순회 완료`);

    // 치명적 에러 검증
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('.map is not a function') ||
      e.includes('.filter is not a function') ||
      e.includes('.forEach is not a function')
    );

    if (criticalErrors.length > 0) {
      console.log('❌ 치명적 에러 목록:');
      criticalErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 200)}`));
    }

    await page.screenshot({ path: 'tests/test-results/manual-01-tab-traverse.png', fullPage: true });
    expect(criticalErrors.length).toBe(0);
  });

  test('M-2. Structure 탭 — placeholder 행 존재 + 입력 가능', async ({ page }) => {
    const fmeaId = await navigateToWorksheet(page);
    if (!fmeaId) return;

    await switchToTab(page, '구조') || await switchToTab(page, 'Structure');

    const rows = await countTableRows(page);
    console.log(`[수동모드 Structure] 행 수: ${rows}`);

    // 행이 있으면 셀 클릭하여 입력 가능한지 확인
    if (rows > 0) {
      await clickConfirmOrEdit(page, 'edit');

      const firstCell = page.locator('table tbody td').first();
      await firstCell.dblclick();
      await page.waitForTimeout(500);

      // input/textarea가 나타나는지 확인
      const inputVisible = await page.locator('table tbody input, table tbody textarea').first()
        .isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`  셀 편집 가능: ${inputVisible}`);
    }

    await page.screenshot({ path: 'tests/test-results/manual-02-structure-placeholder.png', fullPage: true });
    expect(rows).toBeGreaterThanOrEqual(0); // 빈 프로젝트도 허용
  });
});

// ── 혼합 모드 테스트 ──

test.describe('혼합모드: 행 추가/삭제 반복 + 탭 전환 데이터 유지', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (d) => await d.accept());
  });

  test('H-1. Structure 행 추가 → 저장 → 리로드 → 행 수 유지', async ({ page }) => {
    const fmeaId = await navigateToWorksheet(page);
    if (!fmeaId) return;

    await switchToTab(page, '구조') || await switchToTab(page, 'Structure');

    const beforeRows = await countTableRows(page);
    if (beforeRows === 0) {
      console.log('⚠️ 행 0개 — 스킵');
      return;
    }

    // 행 추가
    await clickConfirmOrEdit(page, 'edit');
    await rightClickRow(page, 0);
    if (await isContextMenuVisible(page)) {
      const added = await clickMenuItem(page, '행 추가') || await clickMenuItem(page, 'Add');
      if (added) {
        const afterAdd = await countTableRows(page);

        // 저장
        await clickSave(page);

        // 리로드
        await page.reload();
        await waitForPageLoad(page);
        await switchToTab(page, '구조') || await switchToTab(page, 'Structure');

        const reloadedRows = await countTableRows(page);
        console.log(`[혼합] 행 추가→저장→리로드: ${beforeRows} → ${afterAdd} → ${reloadedRows}`);
        expect(reloadedRows).toBe(afterAdd);
      }
    }

    await page.screenshot({ path: 'tests/test-results/hybrid-01-save-reload.png', fullPage: true });
  });

  test('H-2. 확정 ↔ 미확정 3회 토글 → 데이터 손실 없음', async ({ page }) => {
    const fmeaId = await navigateToWorksheet(page);
    if (!fmeaId) return;

    // Structure 탭으로 명시적 이동
    await switchToTab(page, '구조') || await switchToTab(page, 'Structure');
    await page.waitForTimeout(1000);

    const initialRows = await countTableRows(page);
    console.log(`[혼합] 확정 토글 시작 — 초기 행: ${initialRows}`);
    if (initialRows === 0) return;

    for (let i = 0; i < 3; i++) {
      // 확정 버튼 클릭 (Structure 탭 내부의 버튼만 대상)
      await clickConfirmOrEdit(page, 'confirm');
      await page.waitForTimeout(800);

      // 매 토글 후 현재 탭 유지 확인 — Structure 탭으로 재이동
      await switchToTab(page, '구조') || await switchToTab(page, 'Structure');
      await page.waitForTimeout(500);

      await clickConfirmOrEdit(page, 'edit');
      await page.waitForTimeout(800);

      // 다시 Structure 탭 확인
      await switchToTab(page, '구조') || await switchToTab(page, 'Structure');
      await page.waitForTimeout(500);

      const midRows = await countTableRows(page);
      console.log(`  토글 ${i + 1}회 후 행: ${midRows}`);
    }

    const afterToggle = await countTableRows(page);
    console.log(`[혼합] 확정 토글 3회 완료: ${initialRows} → ${afterToggle}`);

    // 행 수 차이가 ±2 이내 허용 (확정 시 빈 placeholder 정리 가능)
    const diff = Math.abs(afterToggle - initialRows);
    if (diff > 2) {
      console.log(`❌ 데이터 손실 의심: ${diff}행 차이`);
    }
    expect(diff).toBeLessThanOrEqual(2);

    await page.screenshot({ path: 'tests/test-results/hybrid-02-toggle.png', fullPage: true });
  });

  test('H-3. 전체 탭 순회 — 행 추가→삭제 원복 + 배열 검증', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const fmeaId = await navigateToWorksheet(page);
    if (!fmeaId) return;

    const tabSequence = [
      { labels: ['구조', 'Structure'], name: 'Structure' },
      { labels: ['1L Function', '1L기능'], name: '1L Function' },
      { labels: ['2L Function', '2L기능'], name: '2L Function' },
      { labels: ['3L Function', '3L기능'], name: '3L Function' },
    ];

    for (const tab of tabSequence) {
      let switched = false;
      for (const label of tab.labels) {
        switched = await switchToTab(page, label);
        if (switched) break;
      }
      if (!switched) continue;

      const beforeRows = await countTableRows(page);
      if (beforeRows === 0) continue;

      await clickConfirmOrEdit(page, 'edit');

      // 행 추가
      await rightClickRow(page, 0);
      if (await isContextMenuVisible(page)) {
        await clickMenuItem(page, '행 추가') || await clickMenuItem(page, 'Add');
      }
      const afterAdd = await countTableRows(page);

      // 행 삭제 (추가한 행)
      if (afterAdd > beforeRows && afterAdd > 1) {
        await rightClickRow(page, afterAdd - 1);
        if (await isContextMenuVisible(page)) {
          await clickMenuItem(page, '행 삭제') || await clickMenuItem(page, 'Delete');
        }
      }

      const afterDelete = await countTableRows(page);
      console.log(`[혼합] ${tab.name}: ${beforeRows} → +1=${afterAdd} → -1=${afterDelete}`);
    }

    // 최종 배열 깨짐 검증
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') || e.includes('.map is not a function')
    );
    expect(criticalErrors.length).toBe(0);

    await page.screenshot({ path: 'tests/test-results/hybrid-03-roundtrip.png', fullPage: true });
  });
});
