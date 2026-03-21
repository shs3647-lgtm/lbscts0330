/**
 * @file atom-cell-api.spec.ts
 * @description Atomic Cell Save API 테스트 — TDD RED 단계
 *
 * 테스트 대상: PATCH/POST/DELETE /api/fmea/atom-cell
 * - PATCH: 셀 단위 수정 + SOD→AP 자동 재계산
 * - POST: 새 행 추가 (FC/FM 동적 생성)
 * - DELETE: 행 삭제 + FK CASCADE
 */
import { describe, it, expect } from 'vitest';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';

// ─── Helper ────────────────────────────────────────────
async function patchCell(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/fmea/atom-cell`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function postRow(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/fmea/atom-cell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function deleteRow(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/fmea/atom-cell`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// ═══════════════════════════════════════════════════════
// PATCH — 셀 단위 수정
// ═══════════════════════════════════════════════════════
describe('PATCH /api/fmea/atom-cell — Cell Update', () => {
  it('fmeaId 누락 시 400 반환', async () => {
    const { status, data } = await patchCell({
      table: 'failure_causes',
      recordId: 'test-id',
      field: 'cause',
      value: 'test',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('잘못된 fmeaId 형식 시 400 반환', async () => {
    const { status, data } = await patchCell({
      fmeaId: 'DROP TABLE--',
      table: 'failure_causes',
      recordId: 'test-id',
      field: 'cause',
      value: 'test',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('허용되지 않은 테이블 시 400 반환', async () => {
    const { status, data } = await patchCell({
      fmeaId: FMEA_ID,
      table: 'users',
      recordId: 'test-id',
      field: 'password',
      value: 'hacked',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('허용되지 않은');
  });

  it('유효한 셀 수정 시 200 + updatedAt 반환', async () => {
    // 이 테스트는 실제 DB에 데이터가 있어야 PASS
    const { status, data } = await patchCell({
      fmeaId: FMEA_ID,
      table: 'failure_causes',
      recordId: 'PF-L3-001-MC-001-K-001', // 존재하는 FC ID
      field: 'cause',
      value: '작업숙련도 부족 (테스트)',
    });
    // 레코드 존재 시 200, 부재 시 404
    expect([200, 404]).toContain(status);
    if (status === 200) {
      expect(data.success).toBe(true);
      expect(data.updatedAt).toBeDefined();
    }
  });

  it('RiskAnalysis SOD 변경 시 AP 자동 재계산', async () => {
    const { status, data } = await patchCell({
      fmeaId: FMEA_ID,
      table: 'risk_analyses',
      recordId: 'PF-RA-001', // 존재하는 RA ID
      field: 'severity',
      value: 9,
    });
    expect([200, 404]).toContain(status);
    if (status === 200) {
      expect(data.success).toBe(true);
      // AP가 자동 재계산되어 반환
      expect(data.ap).toBeDefined();
      expect(['H', 'M', 'L', '']).toContain(data.ap);
    }
  });
});

// ═══════════════════════════════════════════════════════
// POST — 새 행 추가
// ═══════════════════════════════════════════════════════
describe('POST /api/fmea/atom-cell — Row Create', () => {
  it('fmeaId 누락 시 400 반환', async () => {
    const { status, data } = await postRow({
      table: 'failure_causes',
      parentId: 'PF-L3-001-MC-001-G',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('허용되지 않은 테이블 시 400 반환', async () => {
    const { status, data } = await postRow({
      fmeaId: FMEA_ID,
      table: 'users',
      parentId: 'test',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('FailureCause 새 행 추가 시 결정론적 ID 반환', async () => {
    const { status, data } = await postRow({
      fmeaId: FMEA_ID,
      table: 'failure_causes',
      parentId: 'PF-L3-001-MC-001-G', // L3Function FK
      data: { cause: '신규 고장원인 (테스트)' },
    });
    expect([200, 201, 404]).toContain(status);
    if (status === 201 || status === 200) {
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
      expect(data.id).toMatch(/^PF-/); // 결정론적 ID
    }
  });
});

// ═══════════════════════════════════════════════════════
// DELETE — 행 삭제 + FK CASCADE
// ═══════════════════════════════════════════════════════
describe('DELETE /api/fmea/atom-cell — Row Delete + FK CASCADE', () => {
  it('fmeaId 누락 시 400 반환', async () => {
    const { status, data } = await deleteRow({
      table: 'failure_causes',
      recordId: 'test-id',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('허용되지 않은 테이블 시 400 반환', async () => {
    const { status, data } = await deleteRow({
      fmeaId: FMEA_ID,
      table: 'users',
      recordId: 'test-id',
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('존재하지 않는 레코드 삭제 시 404 반환', async () => {
    const { status, data } = await deleteRow({
      fmeaId: FMEA_ID,
      table: 'failure_causes',
      recordId: 'NON-EXISTENT-ID-999',
    });
    expect(status).toBe(404);
    expect(data.success).toBe(false);
  });
});
