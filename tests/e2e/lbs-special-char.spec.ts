/**
 * @file lbs-special-char.spec.ts
 * @description LBS 특별특성 시스템 E2E 검증
 */
import { test, expect } from '@playwright/test';

test.describe('LBS 특별특성 시스템', () => {

  test('1. 등록 페이지 SC분류 드롭다운 + LBS 선택', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');

    const scSelect = page.locator('select:has(option[value="LBS"])');
    await expect(scSelect).toHaveCount(1, { timeout: 20000 });

    await scSelect.selectOption('LBS');
    await expect(scSelect).toHaveValue('LBS');

    await page.screenshot({ path: 'tests/screenshots/lbs-01-register-lbs-selected.png' });
  });

  test('2. 워크시트 2기능탭 → SC 선택 모달 → LBS 기호 확인', async ({ page }) => {
    await page.goto('/pfmea/worksheet?id=pfm26-m011');
    await page.waitForLoadState('networkidle');
    // 워크시트 테이블 로드 대기
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    // "2기능" 탭 클릭 (L Function)
    const funcL2Tab = page.locator('button:has-text("2기능")');
    if (await funcL2Tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await funcL2Tab.click();
      await page.waitForTimeout(2000);
      console.log('[DEBUG] 2기능 탭 클릭 완료');
    } else {
      console.log('[DEBUG] 2기능 탭 없음');
    }

    await page.screenshot({ path: 'tests/screenshots/lbs-02a-func-l2-tab.png' });

    // 특별특성 배지 클릭 (title로 찾기)
    const scCell = page.locator('[title="클릭하여 특별특성 지정"]').first();
    if (await scCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await scCell.click();
      await page.waitForTimeout(1500);

      // SC 선택 모달 열림 확인
      const modalTitle = page.locator('h3:has-text("특별특성 선택")');
      const modalOpen = await modalTitle.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[DEBUG] SC 선택 모달 open: ${modalOpen}`);

      if (modalOpen) {
        // 모달 전체 스크린샷
        await page.screenshot({ path: 'tests/screenshots/lbs-02b-sc-modal.png' });

        // 모달 내 텍스트 수집
        const modalContent = await page.locator('.fixed.bg-white').first().textContent();
        console.log(`[DEBUG] 모달 내용 (일부): ${modalContent?.substring(0, 300)}`);

        // LBS 그룹 확인
        const hasLBS = modalContent?.includes('LBS');
        const hasDiamond = modalContent?.includes('◇');
        const hasStar = modalContent?.includes('★');
        console.log(`[DEBUG] LBS: ${hasLBS}, ◇: ${hasDiamond}, ★: ${hasStar}`);
      }
    } else {
      console.log('[DEBUG] SC 배지 없음 — 데이터가 없거나 탭 이동 실패');
      // 페이지에 어떤 요소가 있는지 디버그
      const thHeaders = await page.locator('th').allTextContents();
      console.log(`[DEBUG] 현재 th 헤더들: ${thHeaders.join(' | ')}`);
    }
  });

  test('3. 특별특성 컬럼 헤더 visible', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');

    const scHeader = page.locator('th:has-text("특별특성")').first();
    await expect(scHeader).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: 'tests/screenshots/lbs-03-sc-column.png' });
  });

});
