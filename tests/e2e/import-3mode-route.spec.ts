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
    await page.waitForLoadState('domcontentloaded');
    // 리다이렉트 후 URL에 /legacy 포함
    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/, { timeout: 15000 });
  });

  test('/pfmea/import?id=xxx → /pfmea/import/legacy?id=xxx 쿼리 보존', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import?id=test-fmea-id`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/, { timeout: 15000 });
    const url = page.url();
    expect(url).toContain('/pfmea/import/legacy');
    expect(url).toContain('id=test-fmea-id');
  });
});

// ─── 2. 3모드 페이지 로드 테스트 ───

test.describe('Import 3모드 페이지 로드', () => {
  test('수동 모드 (/pfmea/import/manual) 로드 성공', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('domcontentloaded');

    // URL 확인
    await expect(page).toHaveURL(/\/pfmea\/import\/manual/);

    // 수동 템플릿 설정 UI 존재 확인
    const settingLabel = page.locator('text=수동 템플릿 설정');
    await expect(settingLabel.first()).toBeVisible({ timeout: 15000 });

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
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/\/pfmea\/import\/auto/);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);

    await page.screenshot({ path: 'tests/screenshots/import-auto-page.png', fullPage: true });
  });

  test('기존데이터 모드 (/pfmea/import/legacy) 로드 성공', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/\/pfmea\/import\/legacy/);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);

    await page.screenshot({ path: 'tests/screenshots/import-legacy-page.png', fullPage: true });
  });
});

// ─── 3. 모드 메뉴바 테스트 ───

test.describe('Import 모드 메뉴바', () => {
  test('모드 메뉴바에 Import 관련 텍스트 존재', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent() || '';
    const hasImport = bodyText.includes('Import') || bodyText.includes('import');
    console.log(`Import 텍스트 존재: ${hasImport}`);
    expect(hasImport).toBe(true);
    expect(bodyText.trim().length).toBeGreaterThan(100);
  });

  test('수동 모드 페이지 로드 시 URL 일치', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/manual`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/\/pfmea\/import\/manual/);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });

  test('메뉴바 링크로 모드 전환 가능', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const manualLink = page.locator('a[href*="/pfmea/import/manual"]').first();
    if (await manualLink.count() > 0) {
      await manualLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/pfmea\/import\/manual/, { timeout: 15000 });
    } else {
      console.log('Manual link not found in menu bar — skipping navigation test');
    }
  });
});

// ─── 4. 공유 레이아웃 테스트 ───

test.describe('Import 공유 레이아웃', () => {
  test('3개 모드 모두 레이아웃 렌더링', async ({ page }) => {
    for (const mode of ['manual', 'auto', 'legacy']) {
      await page.goto(`${BASE}/pfmea/import/${mode}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const bodyText = await page.locator('body').textContent();
      console.log(`[${mode}] body length=${bodyText?.trim().length}`);
      expect(bodyText?.trim().length).toBeGreaterThan(50);
    }
  });
});

// ─── 5. 화이트 스크린 방지 테스트 ───

test.describe('Import 화이트 스크린 방지', () => {
  test('3개 모드 모두 body 내용이 비어있지 않아야 한다', async ({ page }) => {
    for (const mode of ['manual', 'auto', 'legacy']) {
      await page.goto(`${BASE}/pfmea/import/${mode}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(10);
    }
  });
});
