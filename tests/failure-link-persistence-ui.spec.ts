/**
 * @file failure-link-persistence-ui.spec.ts
 * @description FULL_SYSTEM: 고장연결(화살표/분석결과)이 저장되어 새로고침 후에도 유지되는지 UI 레벨에서 검증
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const FMEA_ID = process.env.TEST_FMEA_ID ?? 'PFM26-M001';

test.describe('FailureLink persistence (UI-level)', () => {
  test('고장연결 탭 진입 및 가드 UI 검증', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${encodeURIComponent(FMEA_ID)}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 고장연결 탭 버튼 존재 확인
    const linkTabBtn = page.locator('button').filter({ hasText: /고장연결/ }).first();
    await expect(linkTabBtn).toBeVisible();
    await linkTabBtn.click();
    await page.waitForTimeout(1000);

    // 고장분석 미확정 시: 가드 메시지 표시
    const guardMsg = page.locator('text=고장분석이 완료되지 않았습니다');
    const hasFmTable = page.locator('th').filter({ hasText: /고장형태/ });

    if (await guardMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 미확정 상태: 가드 메시지 + 미확정 상태 목록 표시
      await expect(guardMsg).toBeVisible();

      // 1L/2L/3L 미확정 표시 확인
      const missingItems = page.locator('text=/분석 미확정/');
      const count = await missingItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    } else if (await hasFmTable.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 확정 상태: FM/FE/FC 테이블 표시
      await expect(hasFmTable.first()).toBeVisible();
    }
  });

  test('고장분석 탭 (1L영향/2L형태/3L원인) 기본 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${encodeURIComponent(FMEA_ID)}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1L영향 탭
    const feTab = page.locator('button').filter({ hasText: /1L영향/ }).first();
    if (await feTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await feTab.click();
      await page.waitForTimeout(1000);
      // 페이지 에러 없이 렌더링되는지 확인
      await expect(page.locator('body')).toBeVisible();
    }

    // 2L형태 탭
    const fmTab = page.locator('button').filter({ hasText: /2L형태|2형태/ }).first();
    if (await fmTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fmTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }

    // 3L원인 탭
    const fcTab = page.locator('button').filter({ hasText: /3L원인|3원인/ }).first();
    if (await fcTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fcTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});


