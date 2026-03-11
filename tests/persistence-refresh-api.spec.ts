/**
 * @file persistence-refresh-api.spec.ts
 * @description FULL_SYSTEM: 레거시/원자성 DB가 모두 존재하고 새로고침(로드 반복)해도 사라지지 않는지 API 레벨에서 검증
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
const FMEA_ID = process.env.TEST_FMEA_ID ?? 'PFM26-001';

test.describe('DB persistence & consistency (API-level)', () => {
  test('rebuildAtomic → diagnostics/legacy/atomic all non-empty and stable', async ({ request }) => {
    // 1) legacy 기반으로 atomic 재구성(중복 제거 + 정합성 확보)
    const rebuild = await request.post(`${BASE}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(FMEA_ID)}`);
    expect(rebuild.ok()).toBeTruthy();
    const rebuildJson = await rebuild.json();
    expect(rebuildJson.ok).toBeTruthy();

    // 2) 진단: 레거시/확정/원자성 카운트 확인
    const diag = await request.get(`${BASE}/api/fmea/diagnostics?fmeaId=${encodeURIComponent(FMEA_ID)}`);
    expect(diag.ok()).toBeTruthy();
    const diagJson = await diag.json();
    expect(diagJson.ok).toBeTruthy();
    expect(diagJson.schema || '').toContain('pfmea_');
    expect(diagJson.legacy.exists).toBeTruthy();
    expect(diagJson.legacy.score).toBeGreaterThan(0);
    expect(diagJson.atomicCounts.l1Structure).toBe(1);
    expect(diagJson.atomicCounts.l2Structures).toBeGreaterThan(0);

    // 3) legacy GET: 직접 레거시 로드 (새로고침/반복 로드에도 동일)
    const legacy1 = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(FMEA_ID)}`);
    expect(legacy1.ok()).toBeTruthy();
    const legacyJson1 = await legacy1.json();
    expect(legacyJson1).toBeTruthy();
    expect(legacyJson1.l1?.name || '').not.toBe('');
    expect(Array.isArray(legacyJson1.l2)).toBeTruthy();
    expect(legacyJson1.l2.length).toBeGreaterThan(0);

    const legacy2 = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(FMEA_ID)}`);
    expect(legacy2.ok()).toBeTruthy();
    const legacyJson2 = await legacy2.json();
    expect(legacyJson2.l1?.name).toBe(legacyJson1.l1?.name);
    expect(legacyJson2.l2?.length).toBe(legacyJson1.l2?.length);

    // 4) atomic GET: raw atomic 로드
    const atomic = await request.get(`${BASE}/api/fmea?fmeaId=${encodeURIComponent(FMEA_ID)}&format=atomic`);
    expect(atomic.ok()).toBeTruthy();
    const atomicJson = await atomic.json();
    expect(atomicJson).toBeTruthy();
    expect(atomicJson.l1Structure).toBeTruthy();
    expect(Array.isArray(atomicJson.l2Structures)).toBeTruthy();
    expect(atomicJson.l2Structures.length).toBeGreaterThan(0);
  });
});


