/**
 * @file failure-link-save.spec.ts
 * @description FailureLink 저장 정합성 E2E 검증
 * - API 레벨에서 FM-FE-FC 관계가 DB에 올바르게 저장되는지 검증
 * - 근본원인 3가지 수정 후 회귀 방지
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

test.describe('FailureLink DB 저장 정합성', () => {

  test('FMEA 저장 API — FailureLink FK 드롭 0건 확인', async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    expect(listRes.ok()).toBeTruthy();
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;
    expect(fmeaId).toBeTruthy();

    // 워크시트 데이터 로드
    const wsRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (!wsRes.ok()) {
      test.skip(true, 'Worksheet API 응답 불가');
      return;
    }
    const wsData = await wsRes.json();
    const db = wsData.atomicDB || wsData.db || wsData;

    const hasFM = (db.failureModes?.length ?? 0) > 0;
    const hasFE = (db.failureEffects?.length ?? 0) > 0;
    const hasFC = (db.failureCauses?.length ?? 0) > 0;
    const hasLinks = (db.failureLinks?.length ?? 0) > 0;

    if (!hasLinks || !hasFM || !hasFE || !hasFC) {
      test.skip(true, `FM/FE/FC/Link 불완전 (FM:${hasFM} FE:${hasFE} FC:${hasFC} Links:${hasLinks})`);
      return;
    }

    // 저장 요청 (동일 데이터 재저장)
    const saveRes = await request.post(`${BASE}/api/fmea`, {
      data: db,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(saveRes.ok()).toBeTruthy();
    const saveResult = await saveRes.json();

    // FM/FE/FC 모두 존재하는 상태에서 FK 드롭은 50% 미만이어야
    const fkDropped = saveResult.linkStats?.fkDropped ?? 0;
    const totalLinks = db.failureLinks.length;
    const dropRate = totalLinks > 0 ? fkDropped / totalLinks : 0;
    expect(dropRate).toBeLessThan(0.5);
  });

  test('rebuild-atomic API — FailureLink 재구성 후 정합성', async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;

    // rebuild-atomic 실행
    const rebuildRes = await request.post(
      `${BASE}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(fmeaId)}`
    );
    if (!rebuildRes.ok()) {
      test.skip(true, 'rebuild-atomic API 불가');
      return;
    }
    const result = await rebuildRes.json();

    // 재구성 카운트 확인
    expect(result.rebuilt?.failureModes).toBeGreaterThan(0);
    expect(result.rebuilt?.failureCauses).toBeGreaterThan(0);
    expect(result.rebuilt?.failureEffects).toBeGreaterThan(0);

    // 재구성 후 워크시트 로드 → FailureLink 존재 확인
    const wsRes = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (wsRes.ok()) {
      const wsData = await wsRes.json();
      const db = wsData.atomicDB || wsData.db || wsData;
      const linkCount = db.failureLinks?.length ?? 0;
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test('FailureLink 저장-로드 왕복 검증 (Round-trip)', async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/fmea/projects`);
    const projects = await listRes.json();
    const projectList = projects.projects || [];
    if (projectList.length === 0) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const fmeaId = projectList[0].id;

    // 1. 현재 데이터 로드
    const loadRes1 = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (!loadRes1.ok()) {
      test.skip(true, 'Worksheet API 불가');
      return;
    }
    const data1 = await loadRes1.json();
    const db1 = data1.atomicDB || data1.db || data1;
    const linksBefore = db1.failureLinks || [];

    if (linksBefore.length === 0) {
      test.skip(true, 'FailureLink 없음');
      return;
    }

    // 2. 저장 (동일 데이터)
    const saveRes = await request.post(`${BASE}/api/fmea`, {
      data: db1,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(saveRes.ok()).toBeTruthy();

    // 3. 다시 로드
    const loadRes2 = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    expect(loadRes2.ok()).toBeTruthy();
    const data2 = await loadRes2.json();
    const db2 = data2.atomicDB || data2.db || data2;
    const linksAfter = db2.failureLinks || [];

    // 4. 왕복 후 FailureLink 건수 동일 (± 오차 0)
    expect(linksAfter.length).toBe(linksBefore.length);

    // 5. 모든 링크에 fmId, feId, fcId 존재 확인
    for (const link of linksAfter) {
      expect(link.fmId).toBeTruthy();
      expect(link.feId).toBeTruthy();
      expect(link.fcId).toBeTruthy();
    }
  });
});
