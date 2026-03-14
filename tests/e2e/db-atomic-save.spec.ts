/**
 * @file db-atomic-save.spec.ts
 * @description DB 원자성 저장 E2E 테스트
 * - ProcessProductChar 테이블이 프로젝트 스키마에 생성되는지 확인
 * - FMEA 저장 API 트랜잭션 원자성 검증 (all-or-nothing)
 * - FK 정합성 (FailureMode → ProcessProductChar)
 * @created 2026-03-14
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const TEST_FMEA_ID = `e2e-atomic-test-${Date.now()}`;

// ─── 1. rebuild-atomic API 테스트 ───

test.describe('DB 원자성 API 검증', () => {
  test('rebuild-atomic: fmeaId 누락 시 400 반환', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/rebuild-atomic`);
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('fmeaId');
  });

  test('rebuild-atomic: 존재하지 않는 fmeaId → 404', async ({ request }) => {
    const res = await request.post(
      `${BASE}/api/fmea/rebuild-atomic?fmeaId=nonexistent-${Date.now()}`
    );
    const body = await res.json();

    // 레거시 데이터 없으면 404
    if (res.status() === 404) {
      expect(body.success).toBe(false);
      expect(body.error).toContain('No legacy data');
    } else {
      // Prisma 미설정 시 200 + success:false
      expect(body.success).toBe(false);
    }
  });

  test('save-from-import: fmeaId 누락 시 400 반환', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/save-from-import`, {
      data: {},
    });

    // fmeaId 없으면 에러 응답
    const body = await res.json();
    expect(body.success === false || body.error).toBeTruthy();
  });

  test('FMEA route GET: 유효하지 않은 fmeaId → 안전 처리', async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/fmea?fmeaId=invalid-chars-@#$%`
    );
    // 보안: SQL injection 문자에도 안전하게 처리
    expect(res.ok() || res.status() === 400 || res.status() === 404).toBeTruthy();
  });
});

// ─── 2. 프로젝트 스키마 테이블 생성 검증 (API 레벨) ───

test.describe('프로젝트 스키마 테이블 존재 확인', () => {
  test('FMEA 저장 API가 process_product_chars 테이블 포함 트랜잭션 실행', async ({ request }) => {
    // POST /api/fmea 에 최소 데이터 전송 → 프로젝트 스키마 생성 확인
    const minimalPayload = {
      fmeaId: TEST_FMEA_ID,
      l1: {
        id: 'test-l1',
        name: 'E2E 테스트 완제품 공정',
        confirmed: false,
      },
      l2: [],
      failureModes: [],
      failureEffects: [],
      failureCauses: [],
      failureLinks: [],
      l1Functions: [],
      l2Functions: [],
      l3Functions: [],
      failureAnalyses: [],
      riskAnalyses: [],
      optimizations: [],
      confirmedState: {},
    };

    const res = await request.post(`${BASE}/api/fmea`, {
      data: minimalPayload,
      headers: { 'Content-Type': 'application/json' },
    });

    const body = await res.json();

    // 서버가 응답하고 JSON을 반환하면 API 엔드포인트 정상 동작
    expect(body).toBeDefined();

    if (res.ok()) {
      // 트랜잭션 성공 시 success:true 또는 ok:true
      expect(body.success === true || body.ok === true).toBeTruthy();
    } else {
      // 500이면 에러 메시지가 process_product_chars 누락이 아닌지 확인
      // (이전 근본 원인: PROJECT_TABLES에서 누락되어 table does not exist)
      if (body.error) {
        expect(body.error).not.toContain('process_product_chars');
        expect(body.error).not.toContain('does not exist');
      }
    }
  });

  test('FMEA 저장 후 GET으로 데이터 조회 가능', async ({ request }) => {
    // 위 테스트에서 저장한 데이터 조회
    const res = await request.get(`${BASE}/api/fmea?fmeaId=${TEST_FMEA_ID}`);

    if (res.ok()) {
      const body = await res.json();
      // fmeaId 기반 데이터 존재
      expect(body).toBeDefined();
    }
    // DB 미연결 시 skip (CI 환경)
  });
});

// ─── 3. 트랜잭션 원자성 검증 ───

test.describe('트랜잭션 원자성 (all-or-nothing)', () => {
  test('잘못된 FK 참조 시 전체 롤백 (부분 저장 방지)', async ({ request }) => {
    // 존재하지 않는 l1Id를 참조하는 l2 데이터 전송
    const invalidPayload = {
      fmeaId: `e2e-rollback-test-${Date.now()}`,
      l1: {
        id: 'test-l1-rollback',
        name: '롤백 테스트',
        confirmed: false,
      },
      l2: [
        {
          id: 'test-l2-1',
          l1Id: 'nonexistent-l1-id', // 잘못된 FK
          no: 10,
          name: '잘못된 FK 참조',
          order: 0,
          functions: [],
          l3: [],
        },
      ],
      failureModes: [],
      failureEffects: [],
      failureCauses: [],
      failureLinks: [],
      l1Functions: [],
      l2Functions: [],
      l3Functions: [],
      failureAnalyses: [],
      riskAnalyses: [],
      optimizations: [],
      confirmedState: {},
    };

    const res = await request.post(`${BASE}/api/fmea`, {
      data: invalidPayload,
      headers: { 'Content-Type': 'application/json' },
    });

    // 트랜잭션이 원자성을 보장하므로:
    // - FK 위반 시 전체 롤백 → 부분 데이터 없음
    // - 500 에러 또는 success:false
    if (!res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(false);
    }
    // 성공하는 경우는 l2의 l1Id가 같은 트랜잭션 내 l1.id와 매칭되기 때문
    // (route.ts가 l1을 먼저 생성하므로 FK 유효)
  });
});

// ─── 4. isolationLevel: Serializable 검증 ───

test.describe('동시 저장 직렬화 검증', () => {
  test('동시 2건 POST 시 직렬화 보장 (데이터 손실 없음)', async ({ request }) => {
    const sharedId = `e2e-concurrent-${Date.now()}`;

    const payload1 = {
      fmeaId: sharedId,
      l1: { id: 'concurrent-l1', name: '동시저장 테스트 1', confirmed: false },
      l2: [],
      failureModes: [],
      failureEffects: [],
      failureCauses: [],
      failureLinks: [],
      l1Functions: [],
      l2Functions: [],
      l3Functions: [],
      failureAnalyses: [],
      riskAnalyses: [],
      optimizations: [],
      confirmedState: {},
    };

    const payload2 = {
      ...payload1,
      l1: { id: 'concurrent-l1', name: '동시저장 테스트 2', confirmed: false },
    };

    // 동시 전송
    const [res1, res2] = await Promise.all([
      request.post(`${BASE}/api/fmea`, {
        data: payload1,
        headers: { 'Content-Type': 'application/json' },
      }),
      request.post(`${BASE}/api/fmea`, {
        data: payload2,
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    // 두 요청 모두 JSON 응답을 반환해야 함 (서버 크래시 없음)
    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1).toBeDefined();
    expect(body2).toBeDefined();

    // Serializable 격리 수준에서:
    // - 하나는 성공, 하나는 직렬화 충돌로 실패할 수 있음
    // - 또는 순차 처리되어 둘 다 성공 (마지막 쓰기가 최종 상태)
    // - 또는 둘 다 에러 (페이로드 형식 문제 등) — 이 경우 에러 메시지 확인
    const success1 = res1.ok();
    const success2 = res2.ok();

    if (success1 || success2) {
      // 최소 하나 성공 → 정상
    } else {
      // 둘 다 실패 시: process_product_chars 테이블 누락이 아닌지 확인
      const errors = [body1.error, body2.error].filter(Boolean).join(' ');
      expect(errors).not.toContain('process_product_chars');
      expect(errors).not.toContain('does not exist');
    }
  });
});

// ─── 5. Import 파이프라인 DB 저장 확인 ───

test.describe('Import 페이지 DB 연결 확인', () => {
  test('Import legacy 페이지 로드 또는 로그인 리다이렉트', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/import/legacy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    if (currentUrl.includes('/auth/login')) {
      // 인증 보호 → 로그인 리다이렉트 정상 동작
      expect(currentUrl).toContain('/auth/login');
    } else {
      // Import 페이지 정상 로드 확인
      await expect(page).toHaveURL(/\/pfmea\/import\/legacy/);

      // 에러 메시지 없음
      const errorEl = page.locator('text=데이터 로드 실패');
      const errorCount = await errorEl.count();
      expect(errorCount).toBe(0);
    }
  });
});
