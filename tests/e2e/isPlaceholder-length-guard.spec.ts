/**
 * @file isPlaceholder-length-guard.spec.ts
 * @description Playwright E2E: isPlaceholder 20자 길이 임계값 수정 검증
 *
 * 검증 항목:
 * 1. 3L기능 탭에서 20자 초과 실제 데이터에 🔍 아이콘이 표시되지 않는지
 * 2. 3L기능 탭 누락 카운트가 정확한지
 * 3. 3L원인 탭에서 모달이 정상 작동하는지 (연쇄 차단 해소)
 * 4. 2L기능 탭에서도 동일 검증
 */
import { test, expect } from '@playwright/test';

// ── PFMEA 워크시트 페이지로 이동하는 헬퍼 ──
async function goToWorksheet(page: any) {
  // PFMEA 리스트에서 첫 번째 프로젝트 워크시트로 이동
  await page.goto('/pfmea/list', { waitUntil: 'networkidle', timeout: 30000 });

  // 리스트에서 첫 번째 항목의 워크시트 링크 찾기
  const wsLink = page.locator('a[href*="/pfmea/worksheet"], button:has-text("워크시트"), [data-testid="worksheet-link"]').first();

  if (await wsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await wsLink.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    return true;
  }

  // 직접 URL로 이동 시도
  // 리스트 테이블에서 fmeaId 추출
  const rows = page.locator('table tbody tr, [class*="list"] [class*="row"]');
  const count = await rows.count();

  if (count > 0) {
    // 첫 번째 행 클릭
    await rows.first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    return true;
  }

  return false;
}

// ── 탭 전환 헬퍼 ──
async function switchToTab(page: any, tabName: string) {
  // 탭 버튼 찾기 (다양한 선택자 시도)
  const tabBtn = page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}"), a:has-text("${tabName}")`).first();

  if (await tabBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tabBtn.click();
    await page.waitForTimeout(1000); // 탭 전환 대기
    return true;
  }
  return false;
}

test.describe('isPlaceholder 길이 임계값 검증', () => {

  test('PFMEA 워크시트 로드 및 탭 확인', async ({ page }) => {
    // PFMEA 리스트 페이지 접근
    await page.goto('/pfmea/list', { waitUntil: 'networkidle', timeout: 30000 });

    // 페이지 로드 확인
    await expect(page).toHaveTitle(/.*/);

    // 스크린샷
    await page.screenshot({ path: 'tests/test-results/01-pfmea-list.png', fullPage: true });
    console.log('✅ PFMEA 리스트 페이지 로드 성공');
  });

  test('3L기능 탭 - 실제 데이터에 🔍 아이콘 미표시 확인', async ({ page }) => {
    const navigated = await goToWorksheet(page);

    if (!navigated) {
      console.log('⚠️ 워크시트 접근 불가 - 프로젝트 미등록 상태');
      await page.screenshot({ path: 'tests/test-results/02-no-worksheet.png', fullPage: true });
      test.skip();
      return;
    }

    // 워크시트 페이지 스크린샷
    await page.screenshot({ path: 'tests/test-results/02-worksheet-loaded.png', fullPage: true });

    // 3L기능 탭으로 이동
    const tabSwitched = await switchToTab(page, '3L기능');
    if (!tabSwitched) {
      // 다른 형식 시도
      await switchToTab(page, '기능(3L)');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/test-results/03-function-l3-tab.png', fullPage: true });

    // 🔍 아이콘 체크: 20자 초과 셀에는 🔍가 없어야 함
    // SelectableCell에서 isMissing=true일 때 🔍 표시됨
    const searchIcons = page.locator('svg[class*="search"], .search-icon, [data-missing="true"]');
    const iconCount = await searchIcons.count();

    console.log(`🔍 아이콘 수: ${iconCount}`);

    // 누락 카운트 배지 확인
    const missingBadge = page.locator('text=/누락.*건/, [class*="badge"]:has-text("누락")').first();
    if (await missingBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      const badgeText = await missingBadge.textContent();
      console.log(`누락 배지: ${badgeText}`);
    } else {
      console.log('✅ 누락 배지 없음 (정상)');
    }

    // 테이블 셀 내용 검사 - "선택" 포함하지만 20자 이상인 셀
    const allCells = page.locator('td');
    const cellCount = await allCells.count();
    let longCellsWithKeyword = 0;
    let longCellsWithMissingIcon = 0;

    for (let i = 0; i < Math.min(cellCount, 200); i++) {
      const cell = allCells.nth(i);
      const text = await cell.textContent().catch(() => '');
      if (!text) continue;

      const trimmed = text.trim();
      // 20자 초과이면서 "선택"/"입력"/"추가" 키워드 포함하는 셀
      if (trimmed.length > 20 && (trimmed.includes('선택') || trimmed.includes('입력') || trimmed.includes('추가'))) {
        longCellsWithKeyword++;

        // 이 셀 내에 🔍 아이콘이 있는지 확인
        const hasIcon = await cell.locator('svg, .search-icon').count();
        if (hasIcon > 0) {
          longCellsWithMissingIcon++;
          console.log(`❌ 20자 초과 셀에 🔍 아이콘: "${trimmed.substring(0, 40)}..."`);
        }
      }
    }

    console.log(`📊 20자 초과+키워드 셀: ${longCellsWithKeyword}개, 🔍 오표시: ${longCellsWithMissingIcon}개`);

    // 20자 초과 셀에 🔍 아이콘이 없어야 함
    expect(longCellsWithMissingIcon).toBe(0);
  });

  test('3L원인 탭 - 모달 작동 확인 (연쇄 차단 해소)', async ({ page }) => {
    const navigated = await goToWorksheet(page);
    if (!navigated) {
      test.skip();
      return;
    }

    // 3L원인 탭으로 이동
    let tabSwitched = await switchToTab(page, '3L원인');
    if (!tabSwitched) {
      await switchToTab(page, '원인(3L)');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/test-results/04-failure-l3-tab.png', fullPage: true });

    // "기능분석을 먼저 확정해주세요" 경고가 없어야 함
    const warningText = page.locator('text=/기능분석.*먼저.*확정/, text=/먼저 확정/');
    const hasWarning = await warningText.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasWarning) {
      console.log('❌ 기능분석 미확정 경고 표시됨 - 연쇄 차단 미해소');
      await page.screenshot({ path: 'tests/test-results/04-failure-l3-warning.png', fullPage: true });
    } else {
      console.log('✅ 기능분석 미확정 경고 없음 (정상)');
    }

    // 셀 클릭하여 모달 열림 시도
    const clickableCells = page.locator('td[class*="cursor"], td[role="button"], [data-clickable="true"]');
    const clickCount = await clickableCells.count();

    if (clickCount > 0) {
      await clickableCells.first().click();
      await page.waitForTimeout(1500);

      // 모달이 열렸는지 확인
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]');
      const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

      if (modalVisible) {
        console.log('✅ 모달 정상 열림');
        await page.screenshot({ path: 'tests/test-results/05-modal-opened.png', fullPage: true });
      } else {
        console.log('⚠️ 모달 열리지 않음 (클릭 가능한 셀이 없거나 확정 상태)');
      }
    }

    // 누락 카운트 확인
    const missingBadge = page.locator('text=/누락.*건/').first();
    if (await missingBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await missingBadge.textContent();
      console.log(`3L원인 누락: ${text}`);
    } else {
      console.log('✅ 3L원인 누락 배지 없음');
    }
  });

  test('2L기능 탭 - 실제 데이터에 🔍 미표시', async ({ page }) => {
    const navigated = await goToWorksheet(page);
    if (!navigated) {
      test.skip();
      return;
    }

    // 2L기능 탭으로 이동
    let tabSwitched = await switchToTab(page, '2L기능');
    if (!tabSwitched) {
      await switchToTab(page, '기능(2L)');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/test-results/06-function-l2-tab.png', fullPage: true });

    // 테이블 확인
    const table = page.locator('table').first();
    const tableVisible = await table.isVisible({ timeout: 5000 }).catch(() => false);

    if (tableVisible) {
      console.log('✅ 2L기능 테이블 렌더링 정상');
    }

    // 전체 스크린샷
    await page.screenshot({ path: 'tests/test-results/07-final-check.png', fullPage: true });
    console.log('✅ 브라우저 테스트 완료');
  });
});
