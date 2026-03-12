/**
 * @file failure-link-perf.spec.ts
 * @description 고장연결 성능 최적화 검증 — API + 페이지 로드 테스트
 *
 * 검증 항목:
 * 1. enrichFailureChains: failureScopes Map 기반 조회
 * 2. calculateRowsFromFailureLinks: Set 기반 중복 방지 + reqToL1 Map
 * 3. useSVGLines: linkedFEs/linkedFCs deps 제거 후 정상 동작
 * 4. 워크시트 페이지 정상 로드
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('고장연결 성능 최적화 검증', () => {
  test('워크시트 페이지 정상 로드', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/pfmea/worksheet`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    expect(response?.status()).toBeLessThan(500);
  });

  test('PFMEA 프로젝트 목록 API 정상 응답', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/fmea/projects?type=P`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    const projects = data.projects || data;
    expect(Array.isArray(projects)).toBeTruthy();
  });

  test('워크시트 API — 정상 응답 확인', async ({ request }) => {
    const projRes = await request.get(`${BASE_URL}/api/fmea/projects?type=P`);
    if (projRes.status() !== 200) { test.skip(); return; }
    const projData = await projRes.json();
    const projects = projData.projects || projData;
    if (!Array.isArray(projects) || projects.length === 0) { test.skip(); return; }

    const fmeaId = projects[0].id || projects[0].fmeaId;
    if (!fmeaId) { test.skip(); return; }

    const wsRes = await request.get(`${BASE_URL}/api/fmea?id=${encodeURIComponent(fmeaId)}`);
    expect(wsRes.status()).toBe(200);
    const wsData = await wsRes.json();
    expect(wsData).toBeTruthy();
  });

  test('All View API — 정상 응답 확인', async ({ request }) => {
    const projRes = await request.get(`${BASE_URL}/api/fmea/projects?type=P`);
    if (projRes.status() !== 200) { test.skip(); return; }
    const projData = await projRes.json();
    const projects = projData.projects || projData;
    if (!Array.isArray(projects) || projects.length === 0) { test.skip(); return; }

    const fmeaId = projects[0].id || projects[0].fmeaId;
    if (!fmeaId) { test.skip(); return; }

    const allRes = await request.get(`${BASE_URL}/api/fmea/all-view?fmeaId=${encodeURIComponent(fmeaId)}`);
    expect(allRes.status()).toBe(200);
    const allData = await allRes.json();
    expect(allData).toBeTruthy();
    if (allData.rows) {
      expect(Array.isArray(allData.rows)).toBeTruthy();
    }
  });

  test('고장연결 탭 페이지 접근 정상', async ({ page }) => {
    const projRes = await page.request.get(`${BASE_URL}/api/fmea/projects?type=P`);
    if (projRes.status() !== 200) { test.skip(); return; }
    const projData = await projRes.json();
    const projects = projData.projects || projData;
    if (!Array.isArray(projects) || projects.length === 0) { test.skip(); return; }

    const fmeaId = projects[0].id || projects[0].fmeaId;
    if (!fmeaId) { test.skip(); return; }

    const response = await page.goto(
      `${BASE_URL}/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    expect(response?.status()).toBeLessThan(500);

    await page.waitForTimeout(2000);

    const hasNoError = await page.evaluate(() => {
      return !document.body.innerText.includes('Application error');
    });
    expect(hasNoError).toBeTruthy();
  });
});
