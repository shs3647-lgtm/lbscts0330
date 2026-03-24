/**
 * @file verify-fl-state.spec.ts
 * @description 고장연결 탭 상태 검증 — DB vs UI 비교
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m006';

test('고장연결 탭 — DB FL=741 vs UI Miss 상태 비교', async ({ page }) => {
  // 1. localStorage 클리어 후 워크시트 로드
  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // 2. 고장연결 탭 클릭
  const tab = page.locator('text=고장연결').first();
  await tab.click();
  await page.waitForTimeout(5000);

  // 3. 스크린샷
  await page.screenshot({ path: 'tests/e2e/screenshots/verify-fl-01.png', fullPage: false });

  // 4. 배지 텍스트 수집
  const allText = await page.locator('body').innerText();

  // FM/FE/FC/Miss 배지 파싱
  const fmMatch = allText.match(/FM:(\d+)/);
  const feMatch = allText.match(/FE:(\d+)/);
  const fcMatch = allText.match(/FC:(\d+)/);
  const missMatch = allText.match(/Miss:(\d+)/);

  console.log('UI badges — FM:', fmMatch?.[1], 'FE:', feMatch?.[1], 'FC:', fcMatch?.[1], 'Miss:', missMatch?.[1]);

  // 5. "누락" 또는 "FE·FC없음" 텍스트 확인
  const missingTexts = await page.locator('text=/FE·FC없음|FE.FC없음/').count();
  console.log('FE·FC없음 count:', missingTexts);

  // 6. API로 DB 직접 확인
  const dbState = await page.evaluate(async (id) => {
    const r = await fetch(`/api/fmea?fmeaId=${id}`);
    const data = await r.json();
    const linkedFmIds = new Set(data.failureLinks?.map((fl: any) => fl.fmId) || []);
    const unlinkedFMs = (data.failureModes || []).filter((fm: any) => !linkedFmIds.has(fm.id));
    return {
      fl: data.failureLinks?.length || 0,
      fm: data.failureModes?.length || 0,
      fe: data.failureEffects?.length || 0,
      fc: data.failureCauses?.length || 0,
      unlinkedFM: unlinkedFMs.length,
      unlinkedFMSample: unlinkedFMs.slice(0, 5).map((fm: any) => fm.mode?.substring(0, 40)),
    };
  }, FMEA_ID);

  console.log('DB state:', JSON.stringify(dbState));

  // 7. DB에서는 미연결 FM=0이어야 함
  expect(dbState.unlinkedFM).toBe(0);
  expect(dbState.fl).toBeGreaterThan(700);

  // 8. "누락" 정보 패널 텍스트 확인
  const warningPanel = page.locator('text=/누락.*FM.*건/').first();
  const warningText = await warningPanel.textContent().catch(() => 'not found');
  console.log('Warning panel:', warningText);

  // 일시정지: 브라우저에서 직접 확인
  await page.pause();
});
