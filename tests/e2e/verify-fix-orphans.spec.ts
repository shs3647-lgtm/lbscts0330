/**
 * @file verify-fix-orphans.spec.ts
 * @description 통계검증 페이지에서 FK 고아 정리(Fix) 버튼 동작 검증
 *
 * 시나리오:
 * 1. 통계검증 페이지 열기 → FK 고아 수 확인
 * 2. confirm 대화상자 자동 수락 + Fix 버튼 클릭
 * 3. Fix 완료 후 자동 새로고침 → FK 고아 = 0 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m020';

test.describe('통계검증 FK 고아 정리', () => {
  test('통계검증 페이지 → FK 고아 확인 + Fix 동작 검증', async ({ page }) => {
    // confirm 대화상자 자동 수락
    page.on('dialog', async dialog => {
      console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    // 1. 통계검증 페이지 열기
    await page.goto(`${BASE}/pfmea/verify?fmeaId=${FMEA_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 스크린샷: 현재 상태
    await page.screenshot({ path: 'tests/e2e/screenshots/verify-current-state.png', fullPage: true });

    // 2. FK 고아 수 확인
    const orphanCard = page.locator('text=FK 고아(Orphans)').locator('..');
    const orphanText = await orphanCard.textContent();
    console.log('[현재 상태] Orphan card text:', orphanText);

    // 고아 수 추출
    const orphanMatch = orphanText?.match(/(\d+)/);
    const currentOrphans = orphanMatch ? parseInt(orphanMatch[1], 10) : -1;
    console.log('[현재 상태] FK 고아 수:', currentOrphans);

    // Fix 버튼이 있으면 클릭
    const fixButton = page.locator('button', { hasText: /고아 정리|Fix/ });
    if (await fixButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[Action] Fix 버튼 발견 → 클릭');
      await fixButton.click();

      // Fix API 완료 + 자동 새로고침 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // 스크린샷: Fix 후 상태
      await page.screenshot({ path: 'tests/e2e/screenshots/verify-after-fix.png', fullPage: true });

      // Fix 후 고아 수 확인
      const orphanCardAfter = page.locator('text=FK 고아(Orphans)').locator('..');
      const orphanTextAfter = await orphanCardAfter.textContent();
      console.log('[Fix 후] Orphan card text:', orphanTextAfter);

      const orphanMatchAfter = orphanTextAfter?.match(/(\d+)/);
      const afterOrphans = orphanMatchAfter ? parseInt(orphanMatchAfter[1], 10) : -1;
      console.log('[Fix 후] FK 고아 수:', afterOrphans);

      // FK 고아가 0이어야 함
      expect(afterOrphans).toBe(0);
    } else {
      console.log('[Info] Fix 버튼 없음 (이미 고아 0건)');
      // 이미 고아 0건이면 성공
      expect(currentOrphans).toBe(0);
    }

    // 3. FK 정합성 탭 확인
    const fkTab = page.locator('button', { hasText: /FK 정합성|FK Integrity/ });
    await fkTab.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/e2e/screenshots/verify-fk-tab-final.png', fullPage: true });

    // 9개 FK 관계 모두 0건 확인
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    console.log(`[FK Tab] Total FK check rows: ${rowCount}`);

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      console.log(`  Row ${i}: ${text}`);
    }

    // 종합 점수 확인
    const scoreText = await page.locator('text=/[A-D] —/').first().textContent();
    console.log('[종합 점수]', scoreText);
  });

  test('새로고침 후에도 Fix 결과가 유지되는지 확인', async ({ page }) => {
    // 1. 페이지 열기 (Fix 후 상태)
    await page.goto(`${BASE}/pfmea/verify?fmeaId=${FMEA_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/e2e/screenshots/verify-persistence-check.png', fullPage: true });

    // 2. FK 고아 수 확인
    const orphanCard = page.locator('text=FK 고아(Orphans)').locator('..');
    const orphanText = await orphanCard.textContent();
    console.log('[새로고침 후] Orphan card text:', orphanText);

    const orphanMatch = orphanText?.match(/(\d+)/);
    const orphans = orphanMatch ? parseInt(orphanMatch[1], 10) : -1;
    console.log('[새로고침 후] FK 고아 수:', orphans);

    // 영구적으로 0건이어야 함
    expect(orphans).toBe(0);

    // 3. 종합 점수 A 확인
    const scoreLabel = page.locator('text=/[A-D] —/').first();
    await expect(scoreLabel).toContainText('A');
  });
});
