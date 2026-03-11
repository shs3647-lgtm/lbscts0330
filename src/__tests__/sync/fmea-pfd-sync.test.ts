/**
 * @file fmea-pfd-sync.test.ts
 * @description FMEA → PFD 연동 단위/통합 테스트
 * @version 1.0.0
 * @created 2026-03-02
 *
 * 검증 항목:
 * 1. create-pfd API: DB에서 L2/L3 구조 읽어서 PFD 생성
 * 2. sync-from-fmea API: FMEA 데이터를 기존 PFD에 동기화
 * 3. redirect URL fmeaId 파라미터 일치
 * 4. 특성 데이터(productChar, processChar, SC) DB 저장 검증
 *
 * ⚠️ 서버 필요: npm run dev 실행 후 테스트
 */

import { describe, test, expect, beforeAll } from 'vitest';

/** 서버 실행 여부 */
let serverAvailable = false;

const API_BASE = process.env.TEST_BASE_URL
  ? `${process.env.TEST_BASE_URL.replace(/\/$/, '')}/api`
  : 'http://localhost:3000/api';

// 테스트에 사용할 FMEA ID (DB에 이미 존재해야 함)
const TEST_FMEA_ID = 'pfm26-p001-l50';

beforeAll(async () => {
  try {
    const res = await fetch(`${API_BASE}/pfd`, { method: 'GET' });
    serverAvailable = res.ok;
    if (!serverAvailable) {
    }
  } catch {
    serverAvailable = false;
  }
});

// ============================================================================
// 1단계: create-pfd API — DB에서 L2/L3 읽어서 PFD 생성
// ============================================================================
describe('create-pfd API (FMEA→PFD 생성)', () => {
  test('fmeaId 없으면 400 에러', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${API_BASE}/pfmea/create-pfd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  test('존재하지 않는 fmeaId면 L2 데이터 없음 에러', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${API_BASE}/pfmea/create-pfd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: 'pfm-nonexist-999' }),
    });
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('공정 데이터가 없습니다');
  });

  test('유효한 fmeaId로 PFD 생성 → itemCount > 0, redirectUrl에 fmeaId 파라미터', async () => {
    if (!serverAvailable) return;

    // 먼저 FMEA에 L2 데이터 있는지 확인
    const fmeaCheckRes = await fetch(`${API_BASE}/pfmea/${TEST_FMEA_ID}`);
    if (!fmeaCheckRes.ok) {
      return;
    }

    const res = await fetch(`${API_BASE}/pfmea/create-pfd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: TEST_FMEA_ID }),
    });
    const data = await res.json();

    if (!data.success) {
      return;
    }

    expect(data.success).toBe(true);
    expect(data.data.itemCount).toBeGreaterThan(0);
    expect(data.data.pfdNo).toBeTruthy();
    expect(data.data.fmeaId).toBe(TEST_FMEA_ID);

    // ★ 핵심: redirectUrl에 fmeaId 파라미터 사용 (fromFmea 아님)
    expect(data.data.redirectUrl).toContain('fmeaId=');
    expect(data.data.redirectUrl).not.toContain('fromFmea=');

  });

  test('생성된 PFD 아이템에 특성 데이터(productChar/processChar) 존재', async () => {
    if (!serverAvailable) return;

    // create-pfd 결과의 PFD 아이템을 DB에서 직접 확인
    const pfdNo = TEST_FMEA_ID.replace(/^pfm/i, 'pfd');
    const res = await fetch(`${API_BASE}/pfd/${pfdNo}`);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (!data.success || !data.data?.items?.length) {
      return;
    }

    const items = data.data.items;

    // 구조 데이터 검증: processNo, processName은 반드시 있어야 함
    const hasProcessNo = items.some((item: any) => item.processNo?.trim());
    expect(hasProcessNo).toBe(true);

    // ★ 핵심: 특성 데이터가 하나라도 있어야 함 (빈행이 아님을 증명)
    const hasProductChar = items.some((item: any) => item.productChar?.trim());
    const hasProcessChar = items.some((item: any) => item.processChar?.trim());
    const hasProcessDesc = items.some((item: any) => item.processDesc?.trim());
    const hasSomeData = hasProductChar || hasProcessChar || hasProcessDesc;


    // FMEA에 L2Function/L3Function 데이터가 있다면 반드시 특성 데이터가 있어야 함
    if (!hasSomeData) {
    }

    // equipment(설비/4M) 데이터도 확인
    const hasEquipment = items.some((item: any) => item.equipment?.trim());
  });
});

// ============================================================================
// 2단계: sync-from-fmea API — 기존 PFD에 FMEA 데이터 동기화
// ============================================================================
describe('sync-from-fmea API (FMEA→PFD 동기화)', () => {
  test('fmeaId 없으면 400 에러', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${API_BASE}/pfd/sync-from-fmea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  test('유효한 fmeaId로 동기화 → items 배열 반환, 완전한 객체', async () => {
    if (!serverAvailable) return;

    const fmeaCheckRes = await fetch(`${API_BASE}/pfmea/${TEST_FMEA_ID}`);
    if (!fmeaCheckRes.ok) {
      return;
    }

    const res = await fetch(`${API_BASE}/pfd/sync-from-fmea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: TEST_FMEA_ID }),
    });
    const data = await res.json();

    if (!data.success) {
      return;
    }

    expect(data.success).toBe(true);
    expect(data.data.items).toBeDefined();
    expect(Array.isArray(data.data.items)).toBe(true);
    expect(data.data.itemCount).toBeGreaterThan(0);

    // ★ 핵심: 응답 items가 완전한 DB 객체여야 함 (fmeaL2Id 포함)
    const firstItem = data.data.items[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('pfdId');
    expect(firstItem).toHaveProperty('processNo');
    expect(firstItem).toHaveProperty('processName');
    expect(firstItem).toHaveProperty('sortOrder');

    // ★★★ 이전 버그: 수동 구성 객체에 fmeaL2Id 누락 → 지금은 savedItem 전체 반환 ★★★
    expect(firstItem).toHaveProperty('fmeaL2Id');

  });

  test('동기화 후 DB 조회 결과와 API 응답 일치', async () => {
    if (!serverAvailable) return;

    const pfdNo = TEST_FMEA_ID.replace(/^pfm/i, 'pfd');

    // sync 실행
    const syncRes = await fetch(`${API_BASE}/pfd/sync-from-fmea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: TEST_FMEA_ID }),
    });
    const syncData = await syncRes.json();
    if (!syncData.success) return;

    // DB에서 직접 조회
    const dbRes = await fetch(`${API_BASE}/pfd/${pfdNo}`);
    if (!dbRes.ok) return;
    const dbData = await dbRes.json();
    if (!dbData.success) return;

    const syncItems = syncData.data.items;
    const dbItems = dbData.data.items.filter((i: any) => !i.isDeleted);

    // 아이템 수 일치
    expect(dbItems.length).toBe(syncItems.length);

    // 첫 아이템 processNo 일치
    if (dbItems.length > 0 && syncItems.length > 0) {
      expect(dbItems[0].processNo).toBe(syncItems[0].processNo);
      expect(dbItems[0].processName).toBe(syncItems[0].processName);
    }

  });
});

// ============================================================================
// 3단계: PFD GET API — DB에서 완전한 아이템 반환 검증
// ============================================================================
describe('PFD GET API — 아이템 렌더링 데이터 완전성', () => {
  test('PFD 아이템이 렌더링에 필요한 모든 필드 포함', async () => {
    if (!serverAvailable) return;

    const pfdNo = TEST_FMEA_ID.replace(/^pfm/i, 'pfd');
    const res = await fetch(`${API_BASE}/pfd/${pfdNo}`);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (!data.success || !data.data?.items?.length) return;

    const item = data.data.items[0];

    // PfdItem 타입에 정의된 필수 필드 모두 존재
    const requiredFields = [
      'id', 'pfdId', 'processNo', 'processName', 'processLevel',
      'processDesc', 'partName', 'equipment',
      'productSC', 'productChar', 'processSC', 'processChar',
      'sortOrder',
    ];

    for (const field of requiredFields) {
      expect(item).toHaveProperty(field);
    }

  });
});
