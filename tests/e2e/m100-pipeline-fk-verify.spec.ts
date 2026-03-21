/**
 * pfm26-m100 — API 검증 (validate-fk + pipeline-verify)
 * 전제: dev 서버 + DB + m100 스키마에 Import 완료
 */
import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m100';
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('m100 API 검증', () => {
  test('validate-fk allGreen', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/validate-fk?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.allGreen, JSON.stringify(j.checks?.filter((c: { status: string }) => c.status === 'ERROR'))).toBe(true);
  });

  test('pipeline-verify: FK 고아 0 · orphanPC 0 · allGreen', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.allGreen).toBe(true);
    const fk = j.steps?.find((s: { step: number }) => s.step === 3);
    expect(fk?.details?.totalOrphans ?? -1).toBe(0);
    const gap = j.steps?.find((s: { step: number }) => s.step === 4);
    expect(gap?.details?.orphanPC ?? -1).toBe(0);
    expect(gap?.details?.emptyPC ?? -1).toBe(0);
  });
});
