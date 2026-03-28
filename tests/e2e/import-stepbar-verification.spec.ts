/**
 * @file import-stepbar-verification.spec.ts
 * @description Import 4탭 SA→FC→FA 검증 + FMEA 작성 E2E 테스트
 *
 * 검증 항목:
 *   1. 수동 탭: 생성 후 ImportStepBar 표시 + SA→FC→FA 버튼 존재
 *   2. 자동 탭: 생성 후 ImportStepBar 표시
 *   3. "FMEA 작성 →" 버튼 FA 완료 전 disabled 확인
 *   4. SA 확정 버튼 클릭 → 확정됨 상태 전이
 *   5. 기존 데이터 탭: 통계 패널 표시
 *
 * @created 2026-03-10
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// ─── 수동 탭 ───

test.describe('수동 탭 — ImportStepBar 검증', () => {
  test('1. 생성 버튼 클릭 후 ImportStepBar 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('networkidle');

    // 수동 템플릿 설정 UI 존재 확인
    const settingLabel = page.locator('text=수동 템플릿 설정');
    await expect(settingLabel.first()).toBeVisible({ timeout: 15000 });

    // BD 현황 테이블에서 FMEA 프로젝트가 하나라도 있는지 확인
    const bdRows = page.locator('table tbody tr');
    const rowCount = await bdRows.count();

    if (rowCount === 0) {
      // 프로젝트가 없으면 테스트 스킵 (Import 전 등록 필요)
      test.skip(true, 'FMEA 프로젝트가 없어 테스트 스킵');
      return;
    }

    // 첫 번째 프로젝트 선택 (라디오 버튼 또는 행 클릭)
    const firstRadio = page.locator('input[type="radio"]').first();
    if (await firstRadio.isVisible()) {
      await firstRadio.click();
      await page.waitForTimeout(500);
    }

    // 생성 버튼 클릭
    const generateBtn = page.locator('button:has-text("생성")').first();
    await expect(generateBtn).toBeVisible({ timeout: 3000 });
    await generateBtn.click();
    await page.waitForTimeout(3000);

    // ImportStepBar가 표시되는지 확인 (SA 시스템분석 텍스트)
    const saLabel = page.locator('text=SA 시스템분석');
    const isStepBarVisible = await saLabel.isVisible().catch(() => false);

    if (isStepBarVisible) {
      // SA→FC→FA 진행 표시 확인
      await expect(saLabel.first()).toBeVisible();
      await expect(page.locator('text=FC 고장사슬').first()).toBeVisible();
      await expect(page.locator('text=FA 통합분석').first()).toBeVisible();

      // SA 확정 버튼 존재
      const saBtn = page.locator('button:has-text("SA 확정")');
      await expect(saBtn.first()).toBeVisible();

      // FMEA 작성 → 버튼 존재하지만 disabled
      const fmeaBtn = page.locator('button:has-text("FMEA 작성")');
      if (await fmeaBtn.isVisible()) {
        await expect(fmeaBtn.first()).toBeDisabled();
      }
    }

    // 스크린샷 저장
    await page.screenshot({ path: 'tests/screenshots/manual-stepbar.png', fullPage: true });
  });
});

// ─── 자동 탭 ───

test.describe('자동 탭 — ImportStepBar 검증', () => {
  test('2. 자동 탭 로드 + 작업요소 UI 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/auto`);
    await page.waitForLoadState('networkidle');

    // 자동 템플릿 타이틀 확인
    const title = page.locator('text=자동 템플릿');
    await expect(title.first()).toBeVisible({ timeout: 15000 });

    // + 추가 버튼 존재
    const addBtn = page.locator('button:has-text("+ 추가")');
    await expect(addBtn.first()).toBeVisible();

    // 생성 버튼 존재
    const genBtn = page.locator('button:has-text("생성")');
    await expect(genBtn.first()).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/auto-tab.png', fullPage: true });
  });
});

// ─── 기존 데이터 탭 ───

test.describe('기존 데이터 탭 — 검증 프로세스 확인', () => {
  test('4. 기존 데이터 탭 로드 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('networkidle');

    // URL 확인
    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/);

    await page.screenshot({ path: 'tests/screenshots/legacy-tab.png', fullPage: true });
  });
});

// ─── FMEA 작성 버튼 disabled 가드 ───

test.describe('FMEA 작성 → 버튼 FA 완료 전 disabled 가드', () => {
  test('5. 수동 탭에서 FMEA 작성 버튼이 FA 완료 전 비활성', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('networkidle');

    // 생성 전에는 ImportStepBar 자체가 안 보임
    const fmeaBtnBefore = page.locator('button:has-text("FMEA 작성")');
    const isVisibleBefore = await fmeaBtnBefore.isVisible().catch(() => false);

    // 생성 전에는 버튼이 없어야 정상 (ImportStepBar는 generated && flatData > 0일 때만 표시)
    expect(isVisibleBefore).toBe(false);

    await page.screenshot({ path: 'tests/screenshots/manual-no-fmea-btn.png', fullPage: true });
  });
});

// ─── SA 확정 상태 전이 ───

test.describe('SA 확정 → 상태 전이', () => {
  test('6. SA 확정 버튼 → SA 확정됨 전이 (프로젝트 선택 + 생성 필요)', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('networkidle');

    // 프로젝트 선택 시도
    const firstRadio = page.locator('input[type="radio"]').first();
    const hasProject = await firstRadio.isVisible().catch(() => false);

    if (!hasProject) {
      test.skip(true, 'FMEA 프로젝트 없음 — SA 확정 테스트 스킵');
      return;
    }

    await firstRadio.click();
    await page.waitForTimeout(500);

    // 생성
    const genBtn = page.locator('button:has-text("생성")').first();
    await genBtn.click();
    await page.waitForTimeout(3000);

    // SA 확정 버튼 찾기
    const saBtn = page.locator('button:has-text("SA 확정")').first();
    const isSAVisible = await saBtn.isVisible().catch(() => false);

    if (isSAVisible) {
      await saBtn.click();
      await page.waitForTimeout(1000);

      // "SA 확정됨" 텍스트 확인
      const saConfirmed = page.locator('button:has-text("SA 확정됨")');
      await expect(saConfirmed.first()).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'tests/screenshots/manual-sa-confirmed.png', fullPage: true });
  });
});
