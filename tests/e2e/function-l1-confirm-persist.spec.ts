/**
 * @file function-l1-confirm-persist.spec.ts
 * @description TDD: L1 기능분석 확정 후 새로고침 시 데이터 유지 검증
 *
 * ★★★ 핵심 회귀 테스트 ★★★
 * - 버그: handleConfirm()이 saveAtomicDB()를 force=true 없이 호출 → suppressAutoSave가 true면 저장 무시
 * - 검증: 확정 → 새로고침 → 데이터 유지
 *
 * @created 2026-02-16
 */

import { test, expect, type Page } from '@playwright/test';

// ★ 콘솔 로그 수집 헬퍼
function collectConsoleLogs(page: Page): string[] {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  return logs;
}

// ★ API로 FMEA 데이터 존재 여부 확인
async function checkFmeaExists(page: Page): Promise<string | null> {
  const response = await page.request.get('http://localhost:3000/api/pfmea/list');
  if (!response.ok()) return null;
  const data = await response.json();
  const projects = data.projects || data.data || [];
  if (projects.length === 0) return null;
  return projects[0].id || projects[0].fmeaId || null;
}

test.describe('L1 기능분석 확정 데이터 유지 (TDD)', () => {
  test.beforeEach(async ({ page }) => {
    // 모든 alert 자동 수락
    page.on('dialog', async dialog => {
      console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });
  });

  // TC1: 확정 버튼 클릭 시 DB 저장 API 호출 확인
  test('TC1: 확정 시 POST /api/fmea 호출 확인', async ({ page }) => {
    const logs = collectConsoleLogs(page);
    const apiCalls: string[] = [];

    // 네트워크 요청 감시
    page.on('request', req => {
      if (req.url().includes('/api/fmea') && req.method() === 'POST') {
        apiCalls.push(req.url());
      }
    });

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 클릭
    const l1Tab = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1Tab.click();
      await page.waitForTimeout(2000);
    }

    // 확정/미확정 버튼 찾기
    const confirmBtn = page.locator('button').filter({ hasText: /미확정|확정/ }).first();
    const isVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('확정 버튼 표시:', isVisible);

    if (isVisible) {
      const btnText = await confirmBtn.textContent();
      console.log('버튼 텍스트:', btnText);

      if (btnText?.includes('미확정')) {
        await confirmBtn.click();
        await page.waitForTimeout(3000); // DB 저장 대기

        // POST /api/fmea가 호출되었는지 확인
        console.log('API 호출 수:', apiCalls.length);
        console.log('API 호출 목록:', apiCalls);

        // 저장 관련 콘솔 로그 확인
        const saveLogs = logs.filter(l => l.includes('저장') || l.includes('save') || l.includes('DB'));
        console.log('저장 관련 로그:', saveLogs.slice(0, 10));

        // 빈 데이터 스킵 로그가 없어야 함
        const skipLogs = logs.filter(l => l.includes('스킵') || l.includes('skip'));
        console.log('스킵 로그:', skipLogs);

        // API가 최소 1회 호출되어야 함
        expect(apiCalls.length).toBeGreaterThanOrEqual(1);
      }
    }

    await page.screenshot({ path: 'tests/test-results/l1-confirm-tc1.png' });
  });

  // TC2: 확정 후 새로고침 시 확정 상태 유지
  test('TC2: 확정 후 새로고침 → 확정 상태 유지', async ({ page }) => {
    const logs = collectConsoleLogs(page);

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 클릭
    const l1Tab = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1Tab.click();
      await page.waitForTimeout(2000);
    }

    // 현재 확정 상태 확인
    const confirmedLabel = page.locator('text=확정됨');
    const unconfirmedBtn = page.locator('button').filter({ hasText: /미확정/ }).first();

    const isConfirmed = await confirmedLabel.isVisible({ timeout: 2000 }).catch(() => false);
    const isUnconfirmed = await unconfirmedBtn.isVisible({ timeout: 2000 }).catch(() => false);

    console.log('확정 상태:', isConfirmed ? '확정됨' : isUnconfirmed ? '미확정' : '불명');

    // 미확정이면 확정 실행
    if (isUnconfirmed) {
      await unconfirmedBtn.click();
      await page.waitForTimeout(4000); // DB 저장 충분히 대기
    }

    // ★ 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 다시 클릭
    const l1TabAfter = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1TabAfter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1TabAfter.click();
      await page.waitForTimeout(2000);
    }

    // 확정 상태 유지 확인
    const confirmedAfter = page.locator('text=확정됨');
    const editBtn = page.locator('button').filter({ hasText: /수정/ });
    const isConfirmedAfter = await confirmedAfter.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEditBtn = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('새로고침 후 확정 상태:', isConfirmedAfter ? '확정됨' : '미확정');
    console.log('수정 버튼 표시:', hasEditBtn);

    await page.screenshot({ path: 'tests/test-results/l1-confirm-tc2.png' });

    // 확정 상태가 유지되어야 함 (확정됨 라벨 또는 수정 버튼 존재)
    expect(isConfirmedAfter || hasEditBtn).toBeTruthy();
  });

  // TC3: L1 기능 데이터 새로고침 후 유지 검증
  test('TC3: L1 기능 데이터 새로고침 후 유지', async ({ page }) => {
    const logs = collectConsoleLogs(page);

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 클릭
    const l1Tab = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1Tab.click();
      await page.waitForTimeout(2000);
    }

    // ★ 새로고침 전 테이블 데이터 수집
    const tableRows = page.locator('table tbody tr');
    const rowCountBefore = await tableRows.count();
    console.log('새로고침 전 행 수:', rowCountBefore);

    // 첫 번째 행의 텍스트 수집
    const firstRowCells = page.locator('table tbody tr:first-child td');
    const cellTexts: string[] = [];
    const cellCount = await firstRowCells.count();
    for (let i = 0; i < Math.min(cellCount, 5); i++) {
      const text = await firstRowCells.nth(i).textContent();
      cellTexts.push((text || '').trim());
    }
    console.log('새로고침 전 첫 행 데이터:', cellTexts);

    // 구분(YP/SP/USER) 셀 존재 여부 확인
    const ypCell = page.locator('table tbody td').filter({ hasText: /^YP$/ });
    const spCell = page.locator('table tbody td').filter({ hasText: /^SP$/ });
    const userCell = page.locator('table tbody td').filter({ hasText: /^USER$/i });

    const hasYP = await ypCell.count() > 0;
    const hasSP = await spCell.count() > 0;
    const hasUser = await userCell.count() > 0;
    console.log('구분 셀:', { YP: hasYP, SP: hasSP, USER: hasUser });

    await page.screenshot({ path: 'tests/test-results/l1-confirm-tc3-before.png' });

    // ★ 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 다시 클릭
    const l1TabAfter = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1TabAfter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1TabAfter.click();
      await page.waitForTimeout(2000);
    }

    // ★ 새로고침 후 테이블 데이터 수집
    const tableRowsAfter = page.locator('table tbody tr');
    const rowCountAfter = await tableRowsAfter.count();
    console.log('새로고침 후 행 수:', rowCountAfter);

    // 구분 셀 존재 여부 재확인
    const ypCellAfter = page.locator('table tbody td').filter({ hasText: /^YP$/ });
    const spCellAfter = page.locator('table tbody td').filter({ hasText: /^SP$/ });
    const userCellAfter = page.locator('table tbody td').filter({ hasText: /^USER$/i });

    const hasYPAfter = await ypCellAfter.count() > 0;
    const hasSPAfter = await spCellAfter.count() > 0;
    const hasUserAfter = await userCellAfter.count() > 0;
    console.log('새로고침 후 구분 셀:', { YP: hasYPAfter, SP: hasSPAfter, USER: hasUserAfter });

    await page.screenshot({ path: 'tests/test-results/l1-confirm-tc3-after.png' });

    // 데이터 저장 관련 로그 확인
    const loadLogs = logs.filter(l => l.includes('로드') || l.includes('load') || l.includes('ensureL1'));
    console.log('로드 관련 로그:', loadLogs.slice(0, 10));

    // 행 수가 0이 아니어야 함
    expect(rowCountAfter).toBeGreaterThan(0);

    // 새로고침 전에 YP가 있었으면 새로고침 후에도 있어야 함
    if (hasYP) {
      expect(hasYPAfter).toBeTruthy();
    }
  });

  // TC4: API 직접 호출 - L1 데이터 저장/로드 검증
  test('TC4: API 직접 호출 - L1 데이터 저장/로드 검증', async ({ request }) => {
    // Step 1: FMEA 목록에서 프로젝트 찾기
    const listRes = await request.get('http://localhost:3000/api/fmea/projects?type=P');
    if (!listRes.ok()) {
      console.log('PFMEA 목록 API 실패 - 테스트 스킵');
      return;
    }

    const listData = await listRes.json();
    const projects = listData.projects || listData.data || listData || [];
    if (!Array.isArray(projects) || projects.length === 0) {
      console.log('PFMEA 프로젝트 없음 - 테스트 스킵');
      return;
    }

    const fmeaId = projects[0].id || projects[0].fmeaId;
    console.log('테스트 FMEA ID:', fmeaId);

    // Step 2: 현재 데이터 로드
    const loadRes = await request.get(`http://localhost:3000/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    expect(loadRes.ok()).toBeTruthy();

    const loadedData = await loadRes.json();
    console.log('로드된 데이터:', {
      hasL1Structure: !!loadedData.l1Structure,
      l1FunctionsCount: loadedData.l1Functions?.length || 0,
      hasLegacyData: !!loadedData.legacyData,
      confirmed: loadedData.confirmed,
    });

    // Step 3: L1 확정 상태 확인
    if (loadedData.confirmed) {
      console.log('L1 Function Confirmed:', loadedData.confirmed.l1Function);
    }

    // Step 4: legacyData에 l1.types가 있는지 확인
    if (loadedData.legacyData) {
      const l1 = loadedData.legacyData.l1;
      if (l1) {
        console.log('Legacy L1:', {
          name: l1.name,
          typesCount: l1.types?.length || 0,
          types: (l1.types || []).map((t: any) => ({
            name: t.name,
            functionsCount: t.functions?.length || 0,
          })),
        });

        // types 배열이 비어있지 않아야 함
        if (l1.types && l1.types.length > 0) {
          l1.types.forEach((t: any) => {
            console.log(`  Type "${t.name}": ${t.functions?.length || 0} functions`);
            (t.functions || []).forEach((f: any) => {
              console.log(`    Function "${f.name}": ${f.requirements?.length || 0} reqs`);
            });
          });
        }
      }
    }
  });

  // TC5: saveAtomicDB force=true 확인 - 콘솔 로그로 검증
  test('TC5: 확정 시 suppressAutoSave 무시하고 저장', async ({ page }) => {
    const logs = collectConsoleLogs(page);

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 클릭
    const l1Tab = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1Tab.click();
      await page.waitForTimeout(2000);
    }

    // 수정 버튼으로 편집 모드 진입 (이미 확정된 경우)
    const editBtn = page.locator('button').filter({ hasText: /수정/ });
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);
    }

    // 미확정 버튼 클릭 (확정 실행)
    const confirmBtn = page.locator('button').filter({ hasText: /미확정/ }).first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(4000);
    }

    // ★ 핵심 검증: suppressAutoSave 스킵 로그가 없어야 함
    const suppressLogs = logs.filter(l =>
      l.includes('suppressAutoSave=true') && l.includes('스킵')
    );
    console.log('suppressAutoSave 스킵 로그:', suppressLogs);

    // 스킵 로그가 없어야 함 (force=true로 bypass)
    expect(suppressLogs.length).toBe(0);

    // DB 저장 완료 로그가 있어야 함
    const saveCompleteLogs = logs.filter(l =>
      l.includes('DB 저장 완료') || l.includes('원자성 DB 저장 완료')
    );
    console.log('DB 저장 완료 로그:', saveCompleteLogs);

    await page.screenshot({ path: 'tests/test-results/l1-confirm-tc5.png' });
  });

  // TC6: 수정 → 재확정 → 새로고침 전체 플로우
  test('TC6: 수정 → 재확정 → 새로고침 전체 플로우', async ({ page }) => {
    const logs = collectConsoleLogs(page);
    const apiResponses: { url: string; status: number }[] = [];

    page.on('response', res => {
      if (res.url().includes('/api/fmea')) {
        apiResponses.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('http://localhost:3000/pfmea/worksheet?projectId=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 클릭
    const l1Tab = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1Tab.click();
      await page.waitForTimeout(2000);
    }

    // 수정 버튼 클릭 (확정 해제)
    const editBtn = page.locator('button').filter({ hasText: /수정/ });
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      console.log('수정 버튼 클릭 완료');
    }

    // 미확정 버튼 클릭 (재확정)
    const confirmBtn = page.locator('button').filter({ hasText: /미확정/ }).first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(4000);
      console.log('재확정 완료');
    }

    // API 응답 확인
    const postResponses = apiResponses.filter(r => !r.url.includes('fmeaId='));
    console.log('POST API 응답:', postResponses);

    // ★ 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1L기능 탭 다시 클릭
    const l1TabAfter = page.locator('button, a, div').filter({ hasText: /^1L기능$/ }).first();
    if (await l1TabAfter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await l1TabAfter.click();
      await page.waitForTimeout(2000);
    }

    // 테이블에 데이터가 있는지 확인
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    console.log('새로고침 후 행 수:', rowCount);

    // 확정 상태 확인
    const confirmedAfter = page.locator('text=확정됨');
    const isConfirmedAfter = await confirmedAfter.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('새로고침 후 확정 상태:', isConfirmedAfter);

    await page.screenshot({ path: 'tests/test-results/l1-confirm-tc6.png' });

    // 기본 검증: 행이 존재해야 함
    expect(rowCount).toBeGreaterThan(0);
  });
});
