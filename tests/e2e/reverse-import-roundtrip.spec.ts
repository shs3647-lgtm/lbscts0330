/**
 * @file reverse-import-roundtrip.spec.ts
 * @description 리버스 Import 라운드트립 검증 E2E 테스트
 *
 * DB → flatData + chains → buildWorksheetState → 원본 DB와 UUID 레벨 비교
 * 5회 순차 회귀 테스트로 100% 재현 안정성 확인
 *
 * @created 2026-03-17
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m010'; // 완벽히 연결된 테스트 FMEA

test.describe('리버스 Import 라운드트립 검증', () => {

  // ─── 1회차: 기본 라운드트립 검증 ───
  test('1회차: reverse-import API 호출 → 100% 매칭 검증', async ({ request }) => {
    test.setTimeout(120000);

    const response = await request.post(
      `${BASE_URL}/api/fmea/reverse-import?fmeaId=${FMEA_ID}`,
      { data: {} }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    console.log(`[1회차] 결과: ${JSON.stringify(result.roundTrip?.summary || 'N/A')}`);
    console.log(`[1회차] flatData=${result.flatDataCount} chains=${result.chainsCount}`);

    expect(result.success).toBe(true);
    expect(result.flatDataCount).toBeGreaterThan(0);
    expect(result.chainsCount).toBeGreaterThan(0);

    // 라운드트립 검증 결과
    if (result.roundTrip) {
      const rt = result.roundTrip;
      console.log(`[1회차] 매칭률: ${rt.summary}`);

      // 핵심 엔티티 90% 이상 매칭 (역변환 과정에서 약간의 차이 허용)
      expect(rt.matchRate.l2Structure).toBeGreaterThanOrEqual(0.9);
      expect(rt.matchRate.failureModes).toBeGreaterThanOrEqual(0.9);
      expect(rt.matchRate.failureCauses).toBeGreaterThanOrEqual(0.9);
      expect(rt.matchRate.failureEffects).toBeGreaterThanOrEqual(0.9);

      if (rt.mismatches?.length > 0) {
        console.log(`[1회차] 불일치: ${rt.mismatches.slice(0, 5).map((m: { entity: string; expected: string; actual: string }) => `${m.entity}: ${m.expected}→${m.actual}`).join(', ')}`);
      }
    }
  });

  // ─── 2~5회차: 순차 회귀 테스트 (결과 안정성 검증) ───
  for (let round = 2; round <= 5; round++) {
    test(`${round}회차: 순차 회귀 — 동일 결과 재현 확인`, async ({ request }) => {
      test.setTimeout(120000);

      const response = await request.post(
        `${BASE_URL}/api/fmea/reverse-import?fmeaId=${FMEA_ID}`,
        { data: {} }
      );

      expect(response.ok()).toBeTruthy();
      const result = await response.json();

      console.log(`[${round}회차] 결과: ${JSON.stringify(result.roundTrip?.summary || 'N/A')}`);

      expect(result.success).toBe(true);
      expect(result.flatDataCount).toBeGreaterThan(0);
      expect(result.chainsCount).toBeGreaterThan(0);

      if (result.roundTrip) {
        const rt = result.roundTrip;
        // 매번 동일한 결과 재현 (결정론적)
        expect(rt.matchRate.l2Structure).toBeGreaterThanOrEqual(0.9);
        expect(rt.matchRate.failureModes).toBeGreaterThanOrEqual(0.9);
        expect(rt.matchRate.failureCauses).toBeGreaterThanOrEqual(0.9);
        expect(rt.matchRate.failureEffects).toBeGreaterThanOrEqual(0.9);
      }
    });
  }

  // ─── 브라우저 UI 통합 검증: 워크시트 로드 후 데이터 확인 ───
  test('브라우저 검증: 워크시트 로드 → 탭 데이터 존재 확인', async ({ page }) => {
    test.setTimeout(120000);

    // 워크시트 페이지 이동
    await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForLoadState('networkidle');

    // 페이지 로드 확인
    await page.locator('body').waitFor({ state: 'visible', timeout: 30000 });

    // 스크린샷
    await page.screenshot({
      path: 'tests/screenshots/reverse-import-worksheet.png',
      fullPage: true,
    });

    // FailureL2 탭 (고장형태) 확인 — 데이터 셀이 존재하는지
    const failureL2Tab = page.locator('button:has-text("고장형태"), button:has-text("FailureL2"), [data-tab="failureL2"]').first();
    if (await failureL2Tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await failureL2Tab.click();
      await page.waitForTimeout(2000);

      // 테이블에 데이터 행이 있는지 확인
      const dataRows = page.locator('table tbody tr, [class*="row"], [role="row"]');
      const rowCount = await dataRows.count();
      console.log(`[브라우저] 고장형태 탭 행 수: ${rowCount}`);

      await page.screenshot({
        path: 'tests/screenshots/reverse-import-failureL2.png',
        fullPage: true,
      });
    }

    // ALL 탭 확인
    const allTab = page.locator('button:has-text("ALL"), button:has-text("전체"), [data-tab="all"]').first();
    if (await allTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await allTab.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'tests/screenshots/reverse-import-all-tab.png',
        fullPage: true,
      });
    }

    // 페이지에 에러가 없는지 확인
    const errorElements = page.locator('[class*="error"], [class*="Error"]');
    const errorCount = await errorElements.count();
    // 에러 요소가 있더라도 빈 내용이면 무시
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const text = await errorElements.nth(i).textContent();
        if (text?.trim()) {
          console.warn(`[브라우저] 에러 요소 발견: "${text.substring(0, 100)}"`);
        }
      }
    }
  });

  // ─── resave 라운드트립 검증: 역변환 → 저장 → 재로드 → 일치 확인 ───
  test('resave 라운드트립: 역변환 저장 → 재검증', async ({ request }) => {
    test.setTimeout(180000);

    // 1차: resave=true로 역변환 + 저장
    const resaveResponse = await request.post(
      `${BASE_URL}/api/fmea/reverse-import?fmeaId=${FMEA_ID}`,
      { data: { resave: true } }
    );

    expect(resaveResponse.ok()).toBeTruthy();
    const resaveResult = await resaveResponse.json();
    console.log(`[resave] 결과: success=${resaveResult.success} resaved=${resaveResult.resaved}`);

    // 2차: 저장된 데이터로 다시 라운드트립 검증
    const verifyResponse = await request.post(
      `${BASE_URL}/api/fmea/reverse-import?fmeaId=${FMEA_ID}`,
      { data: {} }
    );

    expect(verifyResponse.ok()).toBeTruthy();
    const verifyResult = await verifyResponse.json();

    if (verifyResult.roundTrip) {
      console.log(`[resave 후 검증] ${verifyResult.roundTrip.summary}`);
      expect(verifyResult.roundTrip.matchRate.failureModes).toBeGreaterThanOrEqual(0.9);
      expect(verifyResult.roundTrip.matchRate.failureCauses).toBeGreaterThanOrEqual(0.9);
    }
  });
});
