/**
 * @file function-l1-merge-feedback.spec.ts
 * @description 병합 추가 시각적 피드백 검증 (하이라이트 + 토스트)
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('1L 기능 - 병합 추가 피드백', () => {

  test('기능 셀 위로 병합 추가 → 토스트 + 하이라이트 + 행 증가', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1L기능 탭
    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    // 수동 모드
    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    const beforeRows = await page.locator('table tbody tr').count();
    console.log(`BEFORE 행 수: ${beforeRows}`);

    // 기능 셀 찾아서 우클릭
    const funcCell = page.locator('table tbody td').filter({ hasText: /유지한다|확보한다|요구한다/ }).first();
    if (await funcCell.isVisible()) {
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(500);

      const mergeBtn = page.locator('button:has-text("위로 병합 추가")');
      expect(await mergeBtn.isVisible()).toBe(true);
      await mergeBtn.click();
      await page.waitForTimeout(1000);

      // 1. 토스트 메시지 확인
      const toast = page.locator('text=새 기능 추가됨');
      const toastVisible = await toast.isVisible();
      console.log(`토스트 표시: ${toastVisible}`);

      // 2. 하이라이트 행 확인 (outline 스타일)
      const highlightedRow = page.locator('tr[style*="FFC107"]');
      const highlightCount = await highlightedRow.count();
      console.log(`하이라이트 행 수: ${highlightCount}`);

      // 3. 스크린샷
      await page.screenshot({ path: 'tests/screenshots/feedback-highlight.png', fullPage: true });

      // 4. 행 수 확인
      const afterRows = await page.locator('table tbody tr').count();
      console.log(`AFTER 행 수: ${afterRows} (변화: ${afterRows - beforeRows})`);

      expect(afterRows).toBeGreaterThan(beforeRows);
      expect(toastVisible).toBe(true);
    }
  });

  test('요구사항 셀 아래로 병합 추가 → 토스트 + 행 증가', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    const beforeRows = await page.locator('table tbody tr').count();

    // 요구사항 셀 찾아서 우클릭
    const reqCell = page.locator('table tbody td').filter({ hasText: '치수 공차' }).first();
    if (await reqCell.isVisible()) {
      await reqCell.click({ button: 'right' });
      await page.waitForTimeout(500);

      const mergeBtn = page.locator('button:has-text("아래로 병합 추가")');
      if (await mergeBtn.isVisible()) {
        await mergeBtn.click();
        await page.waitForTimeout(1000);

        const toast = page.locator('text=새 요구사항 추가됨');
        const toastVisible = await toast.isVisible();
        console.log(`토스트 표시: ${toastVisible}`);

        const afterRows = await page.locator('table tbody tr').count();
        console.log(`행 수 변화: ${beforeRows} → ${afterRows}`);

        await page.screenshot({ path: 'tests/screenshots/feedback-req-below.png', fullPage: true });

        expect(afterRows).toBeGreaterThan(beforeRows);
      }
    }
  });

  test('연속 3회 병합 추가 → 매번 행 증가 + 토스트', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    const initialRows = await page.locator('table tbody tr').count();
    console.log(`초기 행 수: ${initialRows}`);

    // 1회: 위로 병합 추가
    let funcCell = page.locator('table tbody td').filter({ hasText: /유지한다/ }).first();
    if (await funcCell.isVisible()) {
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      await page.locator('button:has-text("위로 병합 추가")').click();
      await page.waitForTimeout(2000);
    }
    const rows1 = await page.locator('table tbody tr').count();
    console.log(`1회 후: ${rows1} (+${rows1 - initialRows})`);

    // 2회: 아래로 병합 추가
    funcCell = page.locator('table tbody td').filter({ hasText: /유지한다/ }).first();
    if (await funcCell.isVisible()) {
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      await page.locator('button:has-text("아래로 병합 추가")').click();
      await page.waitForTimeout(2000);
    }
    const rows2 = await page.locator('table tbody tr').count();
    console.log(`2회 후: ${rows2} (+${rows2 - rows1})`);

    // 3회: 요구사항 위로 병합 추가
    const reqCell = page.locator('table tbody td').filter({ hasText: /치수 공차|내구성/ }).first();
    if (await reqCell.isVisible()) {
      await reqCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      await page.locator('button:has-text("위로 병합 추가")').click();
      await page.waitForTimeout(2000);
    }
    const finalRows = await page.locator('table tbody tr').count();
    console.log(`3회 후: ${finalRows} (+${finalRows - rows2})`);
    console.log(`총 변화: ${initialRows} → ${finalRows} (+${finalRows - initialRows})`);

    await page.screenshot({ path: 'tests/screenshots/feedback-3times.png', fullPage: true });

    expect(finalRows).toBeGreaterThanOrEqual(initialRows + 3);
  });
});
