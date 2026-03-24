import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const ID = 'pfm26-m006';

test('최종 검증: 고장연결 DB 영속성 + 캐시 무효화', async ({ page }) => {
  // 1. 워크시트 열기 (캐시 무효화 로직이 자동 실행됨)
  await page.goto(`${BASE}/pfmea/worksheet?id=${ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  // 2. 고장연결 탭 클릭
  await page.locator('text=고장연결').first().click();
  await page.waitForTimeout(4000);

  // 3. 배지 수집
  const bodyText = await page.locator('body').innerText();
  const fm = bodyText.match(/FM:(\d+)/)?.[1];
  const fe = bodyText.match(/FE:(\d+)/)?.[1];
  const fc = bodyText.match(/FC:(\d+)/)?.[1];
  const miss = bodyText.match(/Miss:(\d+)/)?.[1];
  console.log(`UI: FM:${fm} FE:${fe} FC:${fc} Miss:${miss || '0'}`);

  // 4. FE·FC없음 확인
  const missingCount = await page.locator('text=/FE·FC없음/').count();
  console.log('FE·FC없음:', missingCount);

  // 5. DB 확인
  const db = await page.evaluate(async (fmeaId) => {
    const r = await fetch(`/api/fmea?fmeaId=${fmeaId}`);
    const d = await r.json();
    const flFmIds = new Set((d.failureLinks || []).map((fl: any) => fl.fmId));
    return {
      fm: d.failureModes?.length, fe: d.failureEffects?.length,
      fc: d.failureCauses?.length, fl: d.failureLinks?.length,
      unlinkedFM: (d.failureModes || []).filter((fm: any) => !flFmIds.has(fm.id)).length,
    };
  }, ID);
  console.log('DB:', JSON.stringify(db));

  // 6. 검증
  expect(Number(fm)).toBe(db.fm); // UI FM = DB FM
  expect(db.unlinkedFM).toBe(0);  // 미연결 FM 0건
  expect(missingCount).toBe(0);   // FE·FC없음 0건

  await page.screenshot({ path: 'tests/e2e/screenshots/final-fl-verify.png' });
  console.log('PASS: 고장연결 DB 영속성 + 캐시 무효화 검증 완료');
});
