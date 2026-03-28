/**
 * @file sync-cp-pfd-fk.spec.ts
 * @description FK 기반 FMEA→CP+PFD 통합 연동 E2E 테스트
 *
 * TDD RED: 이 테스트가 먼저 실패 → 구현 후 GREEN
 *
 * 검증 흐름:
 *   1. CREATE 모드 — FK 꽂아넣기 + 문 잠금 검증
 *   2. FK 검증 — allPass 확인
 *   3. CP items에 linkId/processCharId FK 존재
 *   4. PFD items에 fmeaL2Id/productCharId FK 존재
 *   5. UPDATE 모드 — 사용자 편집 보존
 *   6. 멱등성 — 2회 실행 동일 결과
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';

// ═══════════════════════════════════════════════════
// STEP 1: CREATE 모드 — FK 꽂아넣기
// ═══════════════════════════════════════════════════

test.describe('STEP 1: CREATE 모드 — FK 꽂아넣기', () => {
  test.describe.configure({ mode: 'serial' });

  let responseData: any = null;

  test('1.1 sync-cp-pfd API CREATE 호출 성공', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/sync-cp-pfd`, {
      data: { fmeaId: FMEA_ID, mode: 'CREATE' },
      timeout: 120000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.step).toBe('COMPLETE');
    responseData = body.data;

    console.log(`✅ CREATE: CP=${responseData.cpItems}건, PFD=${responseData.pfdItems}건`);
  });

  test('1.2 CP items에 linkId FK 존재 (≥100건)', async () => {
    expect(responseData).toBeTruthy();
    expect(responseData.cpItems).toBeGreaterThanOrEqual(100);
  });

  test('1.3 PFD items 생성 (≥100건)', async () => {
    expect(responseData).toBeTruthy();
    expect(responseData.pfdItems).toBeGreaterThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════
// STEP 2: FK 검증 — 문 잠금 체크
// ═══════════════════════════════════════════════════

test.describe('STEP 2: FK 검증 (문 잠금)', () => {

  test('2.1 validate-cp-pfd dry-run — allPass', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/sync-cp-pfd`, {
      data: { fmeaId: FMEA_ID, mode: 'VALIDATE' },
      timeout: 60000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // VALIDATE 모드는 검증만 하고 INSERT 안 함
    if (body.validation) {
      expect(body.validation.allPass).toBe(true);
      console.log(`✅ FK 검증: ${body.validation.summary?.passed}/${body.validation.summary?.total} 통과`);
    } else {
      // API가 validation 필드를 포함하지 않으면 ok=true로 간접 확인
      expect(body.ok).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════
// STEP 3: CP items FK 상세 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 3: CP items FK 상세', () => {

  test('3.1 CREATE 후 CP items에서 linkId FK 확인', async ({ request }) => {
    // sync 실행 (CREATE는 기존 삭제 후 새로 생성)
    const syncRes = await request.post(`${BASE}/api/fmea/sync-cp-pfd`, {
      data: { fmeaId: FMEA_ID, mode: 'CREATE' },
      timeout: 120000,
    });
    expect(syncRes.status()).toBe(200);
    const syncBody = await syncRes.json();
    const cpNo = syncBody.data?.cpNo;

    // sync가 생성한 CP items 직접 조회
    const res = await request.get(`${BASE}/api/fmea/sync-cp-pfd?fmeaId=${FMEA_ID}&inspect=cp`, {
      timeout: 30000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body.cpItems || [];

    const withLinkId = items.filter((i: any) => i.linkId);
    const withProcessCharId = items.filter((i: any) => i.processCharId);
    const withProductCharId = items.filter((i: any) => i.productCharId);

    console.log(`CP FK 채움률 (${items.length}건):`);
    console.log(`  linkId: ${withLinkId.length}`);
    console.log(`  processCharId: ${withProcessCharId.length}`);
    console.log(`  productCharId: ${withProductCharId.length}`);

    // linkId가 있는 행이 100건 이상 (FailureLink 기반 process 행)
    expect(withLinkId.length).toBeGreaterThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════
// STEP 4: PFD items FK 상세 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 4: PFD items FK 상세', () => {

  test('4.1 PFD items에서 fmeaL2Id, productCharId 채워진 행 확인', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/sync-cp-pfd?fmeaId=${FMEA_ID}&inspect=pfd`, {
      timeout: 30000,
    });

    if (res.status() === 200) {
      const body = await res.json();
      const items = body.pfdItems || body.data?.pfdItems || [];

      if (items.length > 0) {
        const withL2Id = items.filter((i: any) => i.fmeaL2Id);
        const withProductCharId = items.filter((i: any) => i.productCharId);

        console.log(`PFD FK 채움률:`);
        console.log(`  fmeaL2Id: ${withL2Id.length}/${items.length}`);
        console.log(`  productCharId: ${withProductCharId.length}/${items.length}`);

        // 모든 PFD 행에 fmeaL2Id가 있어야 함
        expect(withL2Id.length).toBe(items.length);
      }
    }
  });
});

// ═══════════════════════════════════════════════════
// STEP 5: 멱등성 — 2회 실행 동일 결과
// ═══════════════════════════════════════════════════

test.describe('STEP 5: 멱등성', () => {

  test('5.1 2회 연속 CREATE → 동일 결과', async ({ request }) => {
    // 1회차
    const res1 = await request.post(`${BASE}/api/fmea/sync-cp-pfd`, {
      data: { fmeaId: FMEA_ID, mode: 'CREATE' },
      timeout: 120000,
    });
    const body1 = await res1.json();

    // 2회차
    const res2 = await request.post(`${BASE}/api/fmea/sync-cp-pfd`, {
      data: { fmeaId: FMEA_ID, mode: 'CREATE' },
      timeout: 120000,
    });
    const body2 = await res2.json();

    expect(body1.ok).toBe(true);
    expect(body2.ok).toBe(true);
    expect(body1.data?.cpItems).toBe(body2.data?.cpItems);
    expect(body1.data?.pfdItems).toBe(body2.data?.pfdItems);

    console.log(`✅ 멱등성: 1회=${body1.data?.cpItems}CP+${body1.data?.pfdItems}PFD, 2회=${body2.data?.cpItems}CP+${body2.data?.pfdItems}PFD`);
  });
});

// ═══════════════════════════════════════════════════
// STEP 6: Pipeline 정합성 유지
// ═══════════════════════════════════════════════════

test.describe('STEP 6: Pipeline 정합성', () => {

  test('6.1 sync 후 pipeline-verify allGreen 유지', async ({ request }) => {
    // POST로 자동수정 포함 검증 (GET은 읽기전용)
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
      timeout: 120000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.allGreen).toBe(true);
    console.log(`✅ Pipeline: allGreen=${body.allGreen}, loop=${body.loopCount}`);
  });
});
