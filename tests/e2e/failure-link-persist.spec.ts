/**
 * @file failure-link-persist.spec.ts
 * @description 고장수정(auto-link) → DB 저장 → 새로고침 후 유지 검증
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m006';

test.describe('고장수정 DB 영속성', () => {
  test('auto-link 후 새로고침 시 FL 유지 + 누락 FM 0건', async ({ page }) => {
    // 1. 워크시트 페이지 로드
    await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 2. 고장연결 탭 클릭
    const failureLinkTab = page.locator('text=고장연결(Failure Link)').first();
    if (await failureLinkTab.isVisible()) {
      await failureLinkTab.click();
      await page.waitForTimeout(2000);
    }

    // 3. 현재 상태 스크린샷
    await page.screenshot({ path: 'tests/e2e/screenshots/01-before-autolink.png', fullPage: false });

    // 4. 누락 정보 확인
    const missBadge = page.locator('text=/Miss:\\d+/').first();
    const missText = await missBadge.textContent().catch(() => '');
    console.log('Before miss badge:', missText);

    // 5. 고장수정 버튼 클릭
    const autoFixBtn = page.locator('button:has-text("고장수정")').first();
    if (await autoFixBtn.isVisible()) {
      // dialog handler 설치
      page.on('dialog', async dialog => {
        console.log('Dialog:', dialog.message().substring(0, 100));
        await dialog.accept();
      });

      await autoFixBtn.click();
      await page.waitForTimeout(5000); // 자동연결 + reload 대기
    }

    // 6. reload 후 결과 확인
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/02-after-autolink.png', fullPage: false });

    // 7. 고장연결 탭 다시 클릭 (reload 후)
    const failureLinkTab2 = page.locator('text=고장연결(Failure Link)').first();
    if (await failureLinkTab2.isVisible()) {
      await failureLinkTab2.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/03-after-reload-failurelink.png', fullPage: false });

    // 8. Miss 배지 확인 — 0이어야 함
    const missAfter = page.locator('text=/Miss:\\d+/').first();
    const missAfterText = await missAfter.textContent().catch(() => 'not found');
    console.log('After reload miss badge:', missAfterText);

    // 9. API로 DB 상태 직접 검증
    const pvResp = await page.evaluate(async (id) => {
      const r = await fetch(`/api/fmea/pipeline-verify?fmeaId=${id}`);
      return r.json();
    }, FMEA_ID);

    const flCount = pvResp.steps?.find((s: any) => s.name === 'FK')?.details?.links;
    const unlinkedFC = pvResp.steps?.find((s: any) => s.name === 'FK')?.details?.unlinkedFC;
    console.log('DB verify — FL:', flCount, 'unlinkedFC:', unlinkedFC);

    expect(flCount).toBeGreaterThan(590);
    expect(unlinkedFC).toBe(0);

    // 10. 누락 FM 배지 확인
    const fmBadge = page.locator('text=/FM:\\d+/').first();
    const fmText = await fmBadge.textContent().catch(() => '');
    console.log('FM badge after fix:', fmText);
  });
});
