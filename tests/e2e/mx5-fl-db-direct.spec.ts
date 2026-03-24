import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const ID = 'pfm26-p007-i07';

test('MX5: DB auto-link 후 고장연결 탭에서 즉시 반영', async ({ page }) => {
  // 1. auto-link 먼저 실행 (서버에서 DB 직접 저장)
  const alRes = await (await fetch(`${BASE}/api/fmea/auto-link?fmeaId=${ID}`, { method: 'POST' })).json();
  console.log('auto-link:', alRes.created?.fl, 'created, total:', alRes.total?.fl);

  // 2. 워크시트 열기
  await page.goto(`${BASE}/pfmea/worksheet?id=${ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // 3. 고장연결 탭 클릭
  await page.locator('text=고장연결').first().click();
  await page.waitForTimeout(5000);

  // 4. 배지 확인
  const body = await page.locator('body').innerText();
  const miss = body.match(/Miss:(\d+)/)?.[1] || '0';
  const fm = body.match(/FM:(\d+)/)?.[1] || '0';
  console.log('UI FM:', fm, 'Miss:', miss);

  // 5. FE·FC없음 개수
  const missingCount = await page.locator('text=/FE·FC없음/').count();
  console.log('FE·FC없음:', missingCount);

  // 6. DB 직접 확인
  const db = await page.evaluate(async (fmeaId) => {
    const r = await fetch(`/api/fmea?fmeaId=${fmeaId}`);
    const d = await r.json();
    const flFmIds = new Set((d.failureLinks || []).map((fl: any) => fl.fmId));
    return {
      fl: d.failureLinks?.length,
      unlinkedFM: (d.failureModes || []).filter((fm: any) => !flFmIds.has(fm.id)).length,
    };
  }, ID);
  console.log('DB FL:', db.fl, 'unlinkedFM:', db.unlinkedFM);

  await page.screenshot({ path: 'tests/e2e/screenshots/mx5-fl-db-direct.png' });

  // UI에서 FE·FC없음이 6건 이하(현장관리 FM 제외)
  expect(missingCount).toBeLessThanOrEqual(1); // 1건 = FIFO 미준수
  expect(db.fl).toBeGreaterThan(500);
});
