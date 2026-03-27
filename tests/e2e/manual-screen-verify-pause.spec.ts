/**
 * 수동 시각 확인용: 각 화면 로드 후 5초 정지 (브라우저에서 확인)
 *
 * 실행 예:
 *   npm run dev
 *   npx playwright test tests/e2e/manual-screen-verify-pause.spec.ts --headed --project=chromium
 *
 * 대상 FMEA (없으면 m002):
 *   set PLAYWRIGHT_FMEA_ID=pfm26-m100
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = process.env.PLAYWRIGHT_FMEA_ID || 'pfm26-m002';
const PAUSE_MS = 5000;

async function pauseForUser(): Promise<void> {
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}

const WORKSHEET_TABS = [
  'structure',
  'function-l1',
  'function-l2',
  'function-l3',
  'failure-l1',
  'failure-l2',
  'failure-l3',
  'failure-link',
] as const;

test.describe('Manual screen pause (5s each)', () => {
  test.skip(!!process.env.CI, '로컬에서 --headed로만 실행 (각 화면 5초 대기)');

  test('PFMEA 주요 화면 순회', async ({ page }) => {
    test.setTimeout(600_000);

    const screens: { name: string; path: string }[] = [
      { name: 'PFMEA list', path: '/pfmea/list' },
      { name: 'PFMEA register', path: `/pfmea/register?id=${encodeURIComponent(FMEA_ID)}` },
      { name: 'PFMEA import', path: `/pfmea/import?id=${encodeURIComponent(FMEA_ID)}` },
    ];

    for (const { name, path } of screens) {
      await test.step(`${name}: ${path}`, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await pauseForUser();
      });
    }

    for (const tab of WORKSHEET_TABS) {
      const path = `/pfmea/worksheet?id=${encodeURIComponent(FMEA_ID)}&tab=${tab}`;
      await test.step(`Worksheet tab ${tab}`, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await pauseForUser();
      });
    }
  });
});
