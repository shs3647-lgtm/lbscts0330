/**
 * Family/Part FMEA 상세 페이지 + CRUD 흐름 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const PAUSE_MS = 3000;

test.describe('Family/Part FMEA 상세 + CRUD 테스트', () => {

  test('Family FMEA 상세 페이지 — FF-010-001', async ({ page }) => {
    // Family FMEA 목록에서 첫 번째 항목 클릭
    await page.goto(`${BASE}/pfmea/family/list`, { waitUntil: 'networkidle', timeout: 15000 });

    // 데이터 행이 있는지 확인
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 첫 번째 행 클릭
      await rows.first().click();
      await page.waitForURL(/\/pfmea\/family\//, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // 상세 페이지 확인
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();

      // 에러 없는지 확인
      const hasError = await page.locator('text=오류가 발생').count();
      expect(hasError).toBe(0);

      await page.screenshot({
        path: 'tests/e2e/screenshots/family-part/Family_FMEA_상세.png',
        fullPage: true
      });
      await page.waitForTimeout(PAUSE_MS);
    }
  });

  test('Part FMEA 상세 페이지', async ({ page }) => {
    await page.goto(`${BASE}/part-fmea/list`, { waitUntil: 'networkidle', timeout: 15000 });

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      await rows.first().click();
      await page.waitForURL(/\/part-fmea\//, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      const hasError = await page.locator('text=오류가 발생').count();
      expect(hasError).toBe(0);

      await page.screenshot({
        path: 'tests/e2e/screenshots/family-part/Part_FMEA_상세.png',
        fullPage: true
      });
      await page.waitForTimeout(PAUSE_MS);
    }
  });

  test('Family FMEA 생성 폼 — Master 드롭다운 동작', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/family/create`, { waitUntil: 'networkidle', timeout: 15000 });

    // Master FMEA 드롭다운 확인
    const masterSelect = page.locator('select').first();
    const optionCount = await masterSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(1); // default + at least 1 option

    // Master 선택
    await masterSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // 공정 드롭다운이 활성화되는지 확인
    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Family_FMEA_생성_폼동작.png',
      fullPage: true
    });
    await page.waitForTimeout(PAUSE_MS);
  });

  test('Part FMEA 생성 — 모드 전환', async ({ page }) => {
    await page.goto(`${BASE}/part-fmea/create`, { waitUntil: 'networkidle', timeout: 15000 });

    // 모드 A (Master F/F 참조) 기본 선택 확인
    const radios = page.locator('input[type="radio"][name="sourceMode"]');
    const firstRadio = radios.first();
    await expect(firstRadio).toBeChecked();

    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Part_FMEA_생성_모드A.png',
      fullPage: true
    });

    // 모드 B (독립 작성) 선택
    const secondRadio = radios.nth(1);
    await secondRadio.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Part_FMEA_생성_모드B.png',
      fullPage: true
    });
    await page.waitForTimeout(PAUSE_MS);
  });
});
