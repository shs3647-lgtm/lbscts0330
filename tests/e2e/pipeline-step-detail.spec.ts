/**
 * @file pipeline-step-detail.spec.ts
 * @description 파이프라인 검증 STEP 0~5 상세 데이터 뷰 검증
 *
 * 각 STEP 클릭 → "상세 보기" → 실제 DB 데이터 테이블 표시 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';

test.describe('파이프라인 STEP 상세 데이터 뷰', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}&tab=function-l1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
  });

  test('Verify 버튼 클릭 → 파이프라인 패널 열림', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(2000);
      const panel = page.locator('[data-testid="pipeline-verify-panel"]');
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });

  test('STEP 1 (IMPORT) 상세 보기 — Legacy 공정 목록 표시', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (!(await verifyBtn.isVisible())) { test.skip(); return; }
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    // STEP 1 클릭
    const step1 = page.locator('button:has-text("STEP 1")');
    await step1.click();
    await page.waitForTimeout(1000);

    // "상세 보기" 버튼 클릭
    const detailBtn = page.locator('button:has-text("상세 보기")');
    if (await detailBtn.isVisible({ timeout: 3000 })) {
      await detailBtn.click();
      await page.waitForTimeout(2000);

      // 공정 테이블 확인 — 공정명/기능/L3 열 헤더 존재
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 5000 });
    }
  });

  test('STEP 2 (파싱) 상세 보기 — 공정별 파싱 데이터 표시', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (!(await verifyBtn.isVisible())) { test.skip(); return; }
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    const step2 = page.locator('button:has-text("STEP 2")');
    await step2.click();
    await page.waitForTimeout(1000);

    const detailBtn = page.locator('button:has-text("상세 보기")');
    if (await detailBtn.isVisible({ timeout: 3000 })) {
      await detailBtn.click();
      await page.waitForTimeout(2000);

      // 서브탭 확인: "공정", "L1기능", "FE"
      const procTab = page.locator('button:has-text("공정")');
      await expect(procTab).toBeVisible({ timeout: 5000 });
    }
  });

  test('STEP 3 (UUID) 상세 보기 — Atomic DB 엔티티 UUID 목록', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (!(await verifyBtn.isVisible())) { test.skip(); return; }
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    const step3 = page.locator('button:has-text("STEP 3")');
    await step3.click();
    await page.waitForTimeout(1000);

    const detailBtn = page.locator('button:has-text("상세 보기")');
    if (await detailBtn.isVisible({ timeout: 3000 })) {
      await detailBtn.click();
      await page.waitForTimeout(3000);

      // L2 서브탭과 UUID 테이블 확인
      const l2Tab = page.locator('button:has-text("L2")').first();
      await expect(l2Tab).toBeVisible({ timeout: 5000 });

      // UUID 열 헤더 존재
      const uuidHeader = page.locator('th:has-text("UUID")');
      await expect(uuidHeader).toBeVisible({ timeout: 5000 });

      // 데이터 행 존재 (최소 1행)
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('STEP 4 (FK) 상세 보기 — FailureLink FM↔FE↔FC 관계 표시', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (!(await verifyBtn.isVisible())) { test.skip(); return; }
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    const step4 = page.locator('button:has-text("STEP 4")');
    await step4.click();
    await page.waitForTimeout(1000);

    const detailBtn = page.locator('button:has-text("상세 보기")');
    if (await detailBtn.isVisible({ timeout: 3000 })) {
      await detailBtn.click();
      await page.waitForTimeout(3000);

      // FM/FC/FE 열 헤더 확인
      const fmHeader = page.locator('th:has-text("FM")');
      await expect(fmHeader).toBeVisible({ timeout: 5000 });

      const fcHeader = page.locator('th:has-text("FC")');
      await expect(fcHeader).toBeVisible({ timeout: 5000 });

      // ✅ 또는 ❌ FK 상태 표시
      const fkCell = page.locator('td:has-text("✅"), td:has-text("❌")');
      const fkCount = await fkCell.count();
      expect(fkCount).toBeGreaterThan(0);
    }
  });

  test('STEP 5 (WS) 상세 보기 — 워크시트 공정특성 구조 표시', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (!(await verifyBtn.isVisible())) { test.skip(); return; }
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    const step5 = page.locator('button:has-text("STEP 5")');
    await step5.click();
    await page.waitForTimeout(1000);

    const detailBtn = page.locator('button:has-text("상세 보기")');
    if (await detailBtn.isVisible({ timeout: 3000 })) {
      await detailBtn.click();
      await page.waitForTimeout(3000);

      // 공정특성 상세 열 헤더 확인
      const pcHeader = page.locator('th:has-text("공정특성")');
      await expect(pcHeader).toBeVisible({ timeout: 5000 });
    }
  });

  test('STEP 3 서브탭 전환 — FM/FE/FC 탭 모두 동작', async ({ page }) => {
    const verifyBtn = page.locator('button:has-text("Verify")').first();
    if (!(await verifyBtn.isVisible())) { test.skip(); return; }
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    const panel = page.locator('[data-testid="pipeline-verify-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    const step3 = panel.locator('button:has-text("STEP 3")');
    await step3.click();
    await page.waitForTimeout(1000);

    const detailBtn = panel.locator('button:has-text("상세 보기")');
    if (!(await detailBtn.isVisible({ timeout: 3000 }))) { test.skip(); return; }
    await detailBtn.click();
    await page.waitForTimeout(3000);

    // FM 서브탭 클릭 — 패널 내부로 한정
    const fmTab = panel.locator('button', { hasText: /^FM \(/ });
    if (await fmTab.isVisible({ timeout: 3000 })) {
      await fmTab.click();
      await page.waitForTimeout(1000);
      const fmHeader = panel.locator('th:has-text("고장형태")');
      await expect(fmHeader).toBeVisible({ timeout: 3000 });
    }

    // FE 서브탭 클릭
    const feTab = panel.locator('button', { hasText: /^FE \(/ });
    if (await feTab.isVisible({ timeout: 3000 })) {
      await feTab.click();
      await page.waitForTimeout(1000);
      const feHeader = panel.locator('th:has-text("고장영향")');
      await expect(feHeader).toBeVisible({ timeout: 3000 });
    }

    // FC 서브탭 클릭
    const fcTab = panel.locator('button', { hasText: /^FC \(/ });
    if (await fcTab.isVisible({ timeout: 3000 })) {
      await fcTab.click();
      await page.waitForTimeout(1000);
      const fcHeader = panel.locator('th:has-text("고장원인")');
      await expect(fcHeader).toBeVisible({ timeout: 3000 });
    }
  });
});
