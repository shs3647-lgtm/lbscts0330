/**
 * @file reverse-import.spec.ts
 * 역설계 Import 시스템 — Playwright E2E 테스트
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md Phase 4
 *
 * API 레벨 E2E: reverse-import → verify → worksheet 로드 → 수량 검증
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SOURCE = 'pfm26-m066';
const TARGET = 'pfm26-e2e-test';

test.describe('역설계 Import E2E', () => {

  test('TC1: reverse-import API 실행 → 수량 검증', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.extracted.l2Structures).toBe(21);
    expect(body.extracted.l3Structures).toBe(91);
    expect(body.extracted.failureModes).toBe(26);
    expect(body.extracted.failureCauses).toBe(104);
    expect(body.extracted.failureLinks).toBe(105);
    expect(body.extracted.riskAnalyses).toBe(105);
  });

  test('TC2: verify API → ALL GREEN', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import/verify`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.allGreen).toBe(true);
    expect(body.V01_fmeaId.allMatch).toBe(true);
    expect(body.V02_fkIntegrity.allMatch).toBe(true);
    expect(body.V03_idempotency.allMatch).toBe(true);
    expect(body.V04_counts.allMatch).toBe(true);
    expect(body.V05_ids.allMatch).toBe(true);
  });

  test('TC3: 워크시트 Atomic 로드 (Legacy 미사용)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea?fmeaId=${TARGET}&format=atomic`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body._isAtomic).toBe(true);
    expect(body.l2Structures.length).toBe(21);
    expect(body.l3Structures.length).toBe(91);
    expect(body.failureModes.length).toBe(26);
    expect(body.failureCauses.length).toBe(104);
    expect(body.failureLinks.length).toBe(105);
  });

  test('TC4: 멱등성 (2회 연속 실행 → 수량 동일)', async ({ request }) => {
    const res1 = await request.post(`${BASE}/api/fmea/reverse-import`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    const body1 = await res1.json();

    const res2 = await request.post(`${BASE}/api/fmea/reverse-import`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    const body2 = await res2.json();

    expect(body1.extracted.l2Structures).toBe(body2.extracted.l2Structures);
    expect(body1.extracted.failureCauses).toBe(body2.extracted.failureCauses);
    expect(body1.extracted.failureLinks).toBe(body2.extracted.failureLinks);
    expect(body1.extracted.riskAnalyses).toBe(body2.extracted.riskAnalyses);
  });

  test('TC5: E01 방지 — fmeaId 불일치 0건', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import/verify`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    const body = await res.json();
    for (const table of body.V01_fmeaId.tables) {
      expect(table.mismatch).toBe(0);
    }
  });

  test('TC6: E04 방지 — uid() 미사용 (UUID 일치)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import/verify`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    const body = await res.json();
    expect(body.V05_ids.allMatch).toBe(true);
  });

  test('TC7: E09 방지 — orphanPC 0건', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import/verify`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: TARGET },
    });
    const body = await res.json();
    const orphanCheck = body.V02_fkIntegrity.checks.find(
      (c: any) => c.entity.includes('orphanPC')
    );
    expect(orphanCheck).toBeDefined();
    expect(orphanCheck.match).toBe(true);
  });

  test('TC8: E13 방지 — RiskAnalysis DC/PC NOT NULL', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea?fmeaId=${TARGET}&format=atomic`);
    const body = await res.json();
    const dcCount = body.riskAnalyses.filter(
      (ra: any) => ra.detectionControl && ra.detectionControl.trim()
    ).length;
    const pcCount = body.riskAnalyses.filter(
      (ra: any) => ra.preventionControl && ra.preventionControl.trim()
    ).length;
    expect(dcCount).toBeGreaterThan(0);
    expect(pcCount).toBeGreaterThan(0);
  });

  test('TC9: 잘못된 fmeaId 거부', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import`, {
      data: { sourceFmeaId: 'invalid; DROP TABLE', targetFmeaId: TARGET },
    });
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test('TC10: 동일 source=target 거부', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/reverse-import`, {
      data: { sourceFmeaId: SOURCE, targetFmeaId: SOURCE },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test('TC11: Import 페이지 역설계 패널 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy?id=${SOURCE}`);
    await page.waitForLoadState('networkidle');

    const panel = page.locator('text=기존 데이터 활용 (역설계 Import)');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });
});
