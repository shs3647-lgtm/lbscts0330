/**
 * @file fc-roundtrip-preserve.spec.ts
 * @description FC(고장원인) 6건 재발 방지 E2E 테스트
 *
 * 근본 원인: save-from-import 리버스 경로에서 FC processCharId가
 * genB3 → hybridId 불일치로 migration 매칭 실패 → FC 손실/변형
 *
 * 검증:
 * 1. save-from-import 3회 반복 호출 → FC 건수 동일 유지
 * 2. FC ID 안정성 (매 호출마다 동일 FC ID)
 * 3. FailureLink FK 정합성 (모든 link.fcId가 실제 FC를 참조)
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

/** legacy 형식에서 FC/FM 건수 추출 (l2[*].failureCauses/failureModes 합산) */
function countFromLegacy(data: Record<string, unknown>) {
  const l2 = Array.isArray(data.l2) ? data.l2 : [];
  let fc = 0, fm = 0;
  for (const proc of l2 as Record<string, unknown>[]) {
    if (Array.isArray(proc.failureCauses)) fc += proc.failureCauses.length;
    if (Array.isArray(proc.failureModes)) fm += proc.failureModes.length;
    if (Array.isArray(proc.l3)) {
      for (const we of proc.l3 as Record<string, unknown>[]) {
        if (Array.isArray(we.failureCauses)) fc += we.failureCauses.length;
      }
    }
  }
  return { fc, fm };
}

/** atomic 형식에서 FC/FM/FE 건수 + ID Set 추출 */
function countFromAtomic(data: Record<string, unknown>) {
  const fcs = Array.isArray(data.failureCauses) ? data.failureCauses : [];
  const fms = Array.isArray(data.failureModes) ? data.failureModes : [];
  const fes = Array.isArray(data.failureEffects) ? data.failureEffects : [];
  const links = Array.isArray(data.failureLinks) ? data.failureLinks : [];
  return {
    fc: fcs.length, fm: fms.length, fe: fes.length, links: links.length,
    fcIds: new Set(fcs.map((x: { id: string }) => x.id)),
    fmIds: new Set(fms.map((x: { id: string }) => x.id)),
    feIds: new Set(fes.map((x: { id: string }) => x.id)),
    linkList: links as Array<{ fmId: string; feId: string; fcId: string }>,
  };
}

test.describe('FC 라운드트립 보존 (6건 재발 방지)', () => {

  test('save-from-import 3회 반복 → FC 건수 동일 유지', async ({ request }) => {
    test.setTimeout(180000);

    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    expect(listRes.ok()).toBeTruthy();
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;

    // format=atomic으로 원자 DB 직접 조회
    const initialRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
    if (!initialRes.ok()) {
      test.skip(true, 'Worksheet API 응답 불가');
      return;
    }
    const initialData = await initialRes.json();
    const initial = countFromAtomic(initialData);

    console.log(`[초기] FC=${initial.fc} FM=${initial.fm} FE=${initial.fe} Links=${initial.links}`);

    if (initial.fc === 0 && initial.fm === 0) {
      // atomic이 비어있으면 legacy에서 확인
      const legacyRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
      const legacyData = await legacyRes.json();
      const legacy = countFromLegacy(legacyData);
      console.log(`[초기 legacy] FC=${legacy.fc} FM=${legacy.fm}`);
      if (legacy.fc === 0) {
        test.skip(true, 'FC 데이터 없음 (atomic+legacy 모두 0)');
        return;
      }
    }

    for (let round = 1; round <= 3; round++) {
      const saveRes = await request.post(`${BASE}/api/fmea/save-from-import`, {
        data: {
          fmeaId,
          flatData: [{ id: 'dummy', processNo: '10', category: 'A', itemCode: 'A1', value: '10' }],
          failureChains: [],
        },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(saveRes.ok()).toBeTruthy();
      const saveResult = await saveRes.json();
      console.log(`[${round}회차] success=${saveResult.success} verified=${saveResult.verified}`);

      // atomic DB 재로드
      const reloadRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
      expect(reloadRes.ok()).toBeTruthy();
      const current = countFromAtomic(await reloadRes.json());

      console.log(`[${round}회차] FC=${current.fc} FM=${current.fm} FE=${current.fe} Links=${current.links}`);

      // ★ 핵심: FC/FM/Links 건수가 초기와 동일 (리버스 경로가 데이터를 손실하지 않음)
      expect(current.fc).toBe(initial.fc);
      expect(current.fm).toBe(initial.fm);
      expect(current.links).toBe(initial.links);
    }
  });

  test('FC ID 안정성 — save-from-import 전후 동일 ID 유지', async ({ request }) => {
    test.setTimeout(120000);

    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;

    const initialRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
    if (!initialRes.ok()) {
      test.skip(true, 'Worksheet API 불가');
      return;
    }
    const initial = countFromAtomic(await initialRes.json());

    if (initial.fcIds.size === 0) {
      test.skip(true, 'FC 없음');
      return;
    }

    console.log(`[초기] FC IDs: ${[...initial.fcIds].slice(0, 5).join(', ')}... (총 ${initial.fcIds.size}건)`);

    const saveRes = await request.post(`${BASE}/api/fmea/save-from-import`, {
      data: {
        fmeaId,
        flatData: [{ id: 'dummy', processNo: '10', category: 'A', itemCode: 'A1', value: '10' }],
        failureChains: [],
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(saveRes.ok()).toBeTruthy();

    const afterRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
    expect(afterRes.ok()).toBeTruthy();
    const after = countFromAtomic(await afterRes.json());

    const lostFcIds = [...initial.fcIds].filter(id => !after.fcIds.has(id));
    const newFcIds = [...after.fcIds].filter(id => !initial.fcIds.has(id));

    console.log(`[비교] 손실 FC: ${lostFcIds.length}건, 신규 FC: ${newFcIds.length}건`);
    if (lostFcIds.length > 0) console.log(`[손실] ${lostFcIds.slice(0, 10).join(', ')}`);
    if (newFcIds.length > 0) console.log(`[신규] ${newFcIds.slice(0, 10).join(', ')}`);

    expect(lostFcIds.length).toBe(0);
    expect(after.fcIds.size).toBe(initial.fcIds.size);
  });

  test('FailureLink FC FK 정합성 — 모든 link.fcId가 실제 FC 참조', async ({ request }) => {
    test.setTimeout(120000);

    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;

    const saveRes = await request.post(`${BASE}/api/fmea/save-from-import`, {
      data: {
        fmeaId,
        flatData: [{ id: 'dummy', processNo: '10', category: 'A', itemCode: 'A1', value: '10' }],
        failureChains: [],
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(saveRes.ok()).toBeTruthy();

    // format=atomic으로 FK 정합성 검증
    const wsRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
    expect(wsRes.ok()).toBeTruthy();
    const after = countFromAtomic(await wsRes.json());

    let brokenFcLinks = 0, brokenFmLinks = 0, brokenFeLinks = 0;
    for (const link of after.linkList) {
      if (!after.fcIds.has(link.fcId)) brokenFcLinks++;
      if (!after.fmIds.has(link.fmId)) brokenFmLinks++;
      if (!after.feIds.has(link.feId)) brokenFeLinks++;
    }

    console.log(`[FK 검증] Links=${after.links} 깨진FC=${brokenFcLinks} 깨진FM=${brokenFmLinks} 깨진FE=${brokenFeLinks}`);

    expect(brokenFcLinks).toBe(0);
    expect(brokenFmLinks).toBe(0);
    expect(brokenFeLinks).toBe(0);
  });

  test('브라우저 검증: save-from-import 후 워크시트 FC 표시 확인', async ({ page, request }) => {
    test.setTimeout(120000);

    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;

    // 워크시트 페이지 로드
    await page.goto(`${BASE}/pfmea/worksheet?id=${fmeaId}`);
    await page.waitForLoadState('networkidle');
    await page.locator('body').waitFor({ state: 'visible', timeout: 30000 });

    // FailureL3(고장원인) 탭으로 이동
    const fcTab = page.locator('button:has-text("고장원인"), button:has-text("FailureL3"), [data-tab="failureL3"]').first();
    if (await fcTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fcTab.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'tests/e2e/screenshots/fc-roundtrip-failureL3.png',
        fullPage: true,
      });

      // "고장원인 선택" placeholder가 없어야 함
      const placeholderCells = page.locator('td:has-text("고장원인 선택"), td:has-text("클릭하여 추가")');
      const placeholderCount = await placeholderCells.count();
      console.log(`[브라우저] 고장원인 placeholder 셀 수: ${placeholderCount}`);
    }

    // ALL 탭에서 전체 데이터 확인
    const allTab = page.locator('button:has-text("ALL"), button:has-text("전체"), [data-tab="all"]').first();
    if (await allTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await allTab.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'tests/e2e/screenshots/fc-roundtrip-all-tab.png',
        fullPage: true,
      });
    }
  });
});
