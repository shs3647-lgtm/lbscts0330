/**
 * @file all-view-api-fields.spec.ts
 * @description All View API DC/PC, LLD, 지속적개선 필드 검증
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('All View API - DC/PC, LLD, 지속적개선 필드 검증', () => {

  test('API 응답에 DC/PC 필드 포함 확인', async ({ request }) => {
    // PFMEA 프로젝트 조회
    const projRes = await request.get(`${BASE}/api/fmea/projects?type=P`);
    if (!projRes.ok()) { test.skip(true, 'FMEA projects API 호출 실패'); return; }
    const projData = await projRes.json();
    if (!projData.success || !projData.data?.length) { test.skip(true, 'PFMEA 프로젝트 없음'); return; }

    const fmeaId = projData.data[0].fmeaId;
    const res = await request.get(`${BASE}/api/fmea/all-view?fmeaId=${encodeURIComponent(fmeaId)}`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.success).toBe(true);

    if (data.rows && data.rows.length > 0) {
      const row = data.rows[0];
      // DC/PC 필드 존재 확인 (값은 null일 수 있음)
      expect(row).toHaveProperty('preventionControl');
      expect(row).toHaveProperty('detectionControl');
      console.log(`DC/PC 필드 확인 완료: PC=${row.preventionControl}, DC=${row.detectionControl}`);
    }
  });

  test('API 응답에 지속적개선 필드 포함 확인', async ({ request }) => {
    const projRes = await request.get(`${BASE}/api/fmea/projects?type=P`);
    if (!projRes.ok()) { test.skip(true, 'API 호출 실패'); return; }
    const projData = await projRes.json();
    if (!projData.success || !projData.data?.length) { test.skip(true, 'PFMEA 없음'); return; }

    const fmeaId = projData.data[0].fmeaId;
    const res = await request.get(`${BASE}/api/fmea/all-view?fmeaId=${encodeURIComponent(fmeaId)}`);
    const data = await res.json();

    if (data.rows && data.rows.length > 0) {
      const row = data.rows[0];
      // 최적화 재평가 필드
      expect(row).toHaveProperty('optNewSeverity');
      expect(row).toHaveProperty('optNewOccurrence');
      expect(row).toHaveProperty('optNewDetection');
      expect(row).toHaveProperty('optNewAP');
      expect(row).toHaveProperty('optCompletionDate');
      // 지속적개선 필드
      expect(row).toHaveProperty('preventionImprove');
      expect(row).toHaveProperty('detectionImprove');
      expect(row).toHaveProperty('improvementEvidence');
      console.log('지속적개선 필드 확인 완료');
    }
  });

  test('API 응답에 LLD 필드 포함 확인', async ({ request }) => {
    const projRes = await request.get(`${BASE}/api/fmea/projects?type=P`);
    if (!projRes.ok()) { test.skip(true, 'API 호출 실패'); return; }
    const projData = await projRes.json();
    if (!projData.success || !projData.data?.length) { test.skip(true, 'PFMEA 없음'); return; }

    const fmeaId = projData.data[0].fmeaId;
    const res = await request.get(`${BASE}/api/fmea/all-view?fmeaId=${encodeURIComponent(fmeaId)}`);
    const data = await res.json();

    if (data.rows && data.rows.length > 0) {
      const row = data.rows[0];
      // LLD 필드
      expect(row).toHaveProperty('lldNo');
      expect(row).toHaveProperty('lldTarget');
      expect(row).toHaveProperty('lldClassification');
      expect(row).toHaveProperty('specialChar');
      console.log('LLD 필드 확인 완료');
    }
  });

  test('API 통계에 LLD/지속적개선 카운트 포함', async ({ request }) => {
    const projRes = await request.get(`${BASE}/api/fmea/projects?type=P`);
    if (!projRes.ok()) { test.skip(true, 'API 호출 실패'); return; }
    const projData = await projRes.json();
    if (!projData.success || !projData.data?.length) { test.skip(true, 'PFMEA 없음'); return; }

    const fmeaId = projData.data[0].fmeaId;
    const res = await request.get(`${BASE}/api/fmea/all-view?fmeaId=${encodeURIComponent(fmeaId)}`);
    const data = await res.json();

    if (data.stats) {
      expect(data.stats).toHaveProperty('withLLD');
      expect(data.stats).toHaveProperty('withImprovement');
      expect(typeof data.stats.withLLD).toBe('number');
      expect(typeof data.stats.withImprovement).toBe('number');
      console.log(`통계: LLD=${data.stats.withLLD}, 지속적개선=${data.stats.withImprovement}`);
    }
  });

  test('fmeaId 없으면 400 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/all-view`);
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});
