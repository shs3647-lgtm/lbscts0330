/**
 * @file approval-revision-system.spec.ts
 * @description 결재/개정 시스템 E2E 테스트
 * - API 응답 검증 (결재 처리, CP/PFD 개정 API)
 * - 결재현황 포털 UI 검증
 * - 레거시 approval/review 페이지 검증
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('결재/개정 시스템 API 검증', () => {

  test('Critical #1: /api/approval/process — DB 기반 결재 처리 (localStorage 제거)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/approval/process`, {
      data: {
        approvalId: 'nonexistent-id',
        approverId: 'test-user',
        decision: 'approve',
        comments: 'test',
        type: 'review',
      },
    });
    const data = await res.json();
    expect(data).toHaveProperty('success');
    // nonexistent-id → 처리할 건이 없음 (404) 또는 DB 미연결 (503)
    if (res.status() === 404) {
      expect(data.success).toBe(false);
      expect(data.error).toContain('처리할 수 있는 결재 건이 없습니다');
    } else if (res.status() === 503) {
      expect(data.error).toContain('DB');
    }
  });

  test('Critical #2: /api/control-plan/revisions — CP 개정 API 존재', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/control-plan/revisions?cpNo=test-cp-e2e`);
    const data = await res.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('revisions');
  });

  test('Critical #3: /api/fmea/revisions — empty catch 수정 확인', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/fmea/revisions?projectId=nonexistent`);
    const data = await res.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('revisions');
  });

  test('Major #4: /api/pfd/revisions — PFD 개정 API 존재', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pfd/revisions?pfdNo=test-pfd-e2e`);
    const data = await res.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('revisions');
  });

  test('Major #7: /api/fmea/approval GET — 결재 상태 조회', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/fmea/approval?fmeaId=test-fmea-e2e`);
    const data = await res.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('approvals');
  });
});

test.describe('결재현황 포털 UI 검증', () => {
  test('Major #5: 결재현황 포털 — 실데이터 표시', async ({ page }) => {
    await page.goto(`${BASE_URL}/approval/approver-portal`);

    // 포털 헤더
    await expect(page.locator('text=MyJob Portal')).toBeVisible({ timeout: 15000 });

    // 건수 배지 (숫자가 포함됨)
    await expect(page.locator('text=/진행 \\d+건/')).toBeVisible();
    await expect(page.locator('text=/지연 \\d+건/')).toBeVisible();
    await expect(page.locator('text=/완료 \\d+건/')).toBeVisible();

    // 결재현황 섹션
    await expect(page.locator('text=1. 결재현황')).toBeVisible();
  });

  test('Major #6: 레거시 approval/review — 토큰 없으면 에러 표시', async ({ page }) => {
    await page.goto(`${BASE_URL}/approval/review`);
    await expect(page.locator('text=결재 토큰이 없습니다')).toBeVisible({ timeout: 10000 });
  });
});
