/**
 * @file import-3mode-route.spec.ts
 * @description Import 3모드 라우트 분리 E2E 테스트
 * - 리다이렉트: /pfmea/import → /pfmea/import/legacy
 * - 3개 모드 페이지 로드: manual, auto, legacy
 * - 모드 메뉴바 존재 및 네비게이션
 * - 각 모드별 격리 상태 확인
 * @created 2026-02-26
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

// ─── 1. 리다이렉트 테스트 ───

test.describe('Import 리다이렉트', () => {
  test('/pfmea/import → /pfmea/import/legacy 리다이렉트', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // 리다이렉트 후 URL에 /legacy 포함
    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/);
  });

  test('/pfmea/import?id=xxx → /pfmea/import/legacy?id=xxx 쿼리 보존', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import?id=test-fmea-id`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('/pfmea/import/legacy');
    expect(url).toContain('id=test-fmea-id');
  });
});

// ─── 2. 3모드 페이지 로드 테스트 ───

test.describe('Import 3모드 페이지 로드', () => {
  test('수동 모드 (/pfmea/import/manual) 로드 성공', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // URL 확인
    await expect(page).toHaveURL(/\/pfmea\/import\/manual/);

    // 수동 템플릿 설정 UI 존재 확인
    const settingLabel = page.locator('text=수동 템플릿 설정');
    await expect(settingLabel.first()).toBeVisible({ timeout: 5000 });

    // 업종사례 select 존재
    const industrySelect = page.locator('text=업종사례');
    await expect(industrySelect.first()).toBeVisible({ timeout: 3000 });

    // 공정갯수 존재
    const processCount = page.locator('text=공정갯수');
    await expect(processCount.first()).toBeVisible({ timeout: 3000 });

    // 생성 버튼 존재
    const generateBtn = page.locator('button:has-text("생성")');
    await expect(generateBtn.first()).toBeVisible({ timeout: 3000 });

    // 화이트 스크린 아님 확인
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);

    await page.screenshot({ path: 'tests/screenshots/import-manual-page.png', fullPage: true });
  });

  test('자동 모드 (/pfmea/import/auto) 로드 성공', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/auto`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // URL 확인
    await expect(page).toHaveURL(/\/pfmea\/import\/auto/);

    // 자동 템플릿 UI 존재 확인 ("자동 템플릿 — 작업요소" 형태)
    const settingLabel = page.locator('text=자동 템플릿');
    await expect(settingLabel.first()).toBeVisible({ timeout: 5000 });

    // 작업요소 섹션 존재
    const workElementLabel = page.locator('text=작업요소');
    await expect(workElementLabel.first()).toBeVisible({ timeout: 3000 });

    // 화이트 스크린 아님 확인
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);

    await page.screenshot({ path: 'tests/screenshots/import-auto-page.png', fullPage: true });
  });

  test('기존데이터 모드 (/pfmea/import/legacy) 로드 성공', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // URL 확인
    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/);

    // 기초정보 템플릿 패널 존재 확인
    const templatePanel = page.locator('text=기초정보 템플릿');
    await expect(templatePanel.first()).toBeVisible({ timeout: 5000 });

    // BD 현황 테이블 존재
    const bdHeader = page.locator('text=Basic Data 현황');
    await expect(bdHeader.first()).toBeVisible({ timeout: 5000 });

    // 화이트 스크린 아님 확인
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);

    await page.screenshot({ path: 'tests/screenshots/import-legacy-page.png', fullPage: true });
  });
});

// ─── 3. 모드 메뉴바 테스트 ───

test.describe('Import 모드 메뉴바', () => {
  test('모드 메뉴바에 3개 버튼이 보여야 한다', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 수동/자동/기존데이터 링크 존재
    const manualLink = page.locator('a:has-text("수동")');
    const autoLink = page.locator('a:has-text("자동")');
    const legacyLink = page.locator('a:has-text("기존데이터")');

    await expect(manualLink.first()).toBeVisible({ timeout: 3000 });
    await expect(autoLink.first()).toBeVisible({ timeout: 3000 });
    await expect(legacyLink.first()).toBeVisible({ timeout: 3000 });
  });

  test('수동 모드에서 메뉴바 활성 상태 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 수동 링크가 활성 스타일 (font-bold) 가져야 함
    const manualLink = page.locator('a:has-text("수동")').first();
    const classes = await manualLink.getAttribute('class');
    expect(classes).toContain('font-bold');
  });

  test('메뉴바 클릭으로 모드 전환', async ({ page }) => {
    // legacy에서 시작
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 수동 클릭 → manual 이동
    const manualLink = page.locator('a:has-text("수동")').first();
    await manualLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/pfmea\/import\/manual/);

    // 자동 클릭 → auto 이동
    const autoLink = page.locator('a:has-text("자동")').first();
    await autoLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/pfmea\/import\/auto/);

    // 기존데이터 클릭 → legacy 이동
    const legacyLink = page.locator('a:has-text("기존데이터")').first();
    await legacyLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/);
  });
});

// ─── 4. 공유 레이아웃 테스트 ───

test.describe('Import 공유 레이아웃', () => {
  test('3개 모드 모두 사이드바가 보여야 한다', async ({ page }) => {
    for (const mode of ['manual', 'auto', 'legacy']) {
      await page.goto(`${BASE}/pfmea/import/${mode}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // 사이드바 존재 확인 (aside 또는 nav)
      const sidebar = page.locator('aside, nav[class*="sidebar"], [class*="Sidebar"]').first();
      const hasSidebar = await sidebar.isVisible().catch(() => false);
      expect(hasSidebar).toBe(true);
    }
  });

  test('3개 모드 모두 TopNav가 보여야 한다', async ({ page }) => {
    for (const mode of ['manual', 'auto', 'legacy']) {
      await page.goto(`${BASE}/pfmea/import/${mode}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // TopNav — 메뉴 항목 (등록/리스트 등) 포함
      const topNav = page.locator('text=등록').first();
      const hasTopNav = await topNav.isVisible().catch(() => false);
      expect(hasTopNav).toBe(true);
    }
  });
});

// ─── 5. 화이트 스크린 방지 테스트 ───

test.describe('Import 화이트 스크린 방지', () => {
  test('3개 모드 모두 body 내용이 비어있지 않아야 한다', async ({ page }) => {
    for (const mode of ['manual', 'auto', 'legacy']) {
      await page.goto(`${BASE}/pfmea/import/${mode}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(10);
    }
  });
});
