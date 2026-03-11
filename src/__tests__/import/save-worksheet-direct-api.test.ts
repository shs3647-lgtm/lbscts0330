/**
 * @file save-worksheet-direct-api.test.ts
 * @description saveWorksheetFromImport 서버사이드 API 호출 검증
 *
 * 2026-03-10: 서버사이드 저장 API(/api/fmea/save-from-import) 전환 후 검증
 *
 * 검증 항목:
 *   1. API 성공 → success: true 반환
 *   2. API 실패 (response.ok=false) → success: false + error 메시지
 *   3. API 응답 success=false → success: false 반환
 *   4. fmeaId 유효성 검사 (빈 문자열, 무효 ID)
 *   5. buildWorksheetState 실패 → success: false
 *   6. fetch 네트워크 에러 → success: false + catch
 *   7. /api/fmea/save-from-import URL로 POST 호출 확인
 *   8. 요청 body에 fmeaId, flatData 포함 확인
 *   9. db-storage의 saveWorksheetDB 미사용 확인
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

// ── Mock: buildWorksheetState ──
const mockBuildResult = {
  success: true,
  state: {
    l1: [{ id: 'l1-1', name: 'L1', types: [] }],
    l2: [
      {
        id: 'l2-10',
        no: '10',
        name: '공정10',
        l3: [{ id: 'l3-1', name: '작업1', m4: 'MN', functions: [], failureModes: [] }],
        functions: [],
        failureModes: [],
      },
    ],
  },
  diagnostics: {
    l2Count: 1, l3Count: 1, l1TypeCount: 0,
    l2FuncCount: 0, l3FuncCount: 0, processCharCount: 0, productCharCount: 0,
    fmCount: 0, fcCount: 0, feCount: 0, warnings: [],
  },
};

vi.mock('@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState', () => ({
  buildWorksheetState: vi.fn(() => mockBuildResult),
}));

vi.mock('@/app/(fmea-core)/pfmea/import/utils/fm-gap-feedback', () => ({
  applyFmGapFeedback: vi.fn(() => ({ totalAdded: 0, summary: '', additionalItems: [] })),
}));

vi.mock('@/lib/security', () => ({
  isValidFmeaId: vi.fn((id: string) => typeof id === 'string' && id.length >= 3),
}));

// ── 테스트 헬퍼 ──

function makeFlatData(count = 3): ImportedFlatData[] {
  const items: ImportedFlatData[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      processNo: '10',
      category: i < 2 ? 'A' : 'B',
      itemCode: i === 0 ? 'A1' : i === 1 ? 'A2' : 'B1',
      value: `값${i}`,
      createdAt: new Date(),
    });
  }
  return items;
}

// ── 테스트 ──

describe('saveWorksheetFromImport — 서버사이드 /api/fmea/save-from-import 호출', () => {
  let saveWorksheetFromImport: typeof import('@/app/(fmea-core)/pfmea/import/utils/saveWorksheetFromImport')['saveWorksheetFromImport'];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import('@/app/(fmea-core)/pfmea/import/utils/saveWorksheetFromImport');
    saveWorksheetFromImport = mod.saveWorksheetFromImport;
  });

  it('1. API 성공 → success: true 반환', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, atomicCounts: { l2Structures: 1 } }),
    });
    global.fetch = mockFetch;

    const result = await saveWorksheetFromImport({
      fmeaId: 'test-fmea-001',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(true);
  });

  it('2. API 실패 (response.ok=false) → success: false + error 메시지', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: '서버 오류 500' }),
    });

    const result = await saveWorksheetFromImport({
      fmeaId: 'test-fmea-002',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('서버 오류 500');
  });

  it('3. API 응답 success=false → success: false 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: '트랜잭션 실패' }),
    });

    const result = await saveWorksheetFromImport({
      fmeaId: 'test-fmea-003',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('트랜잭션 실패');
  });

  it('4-A. fmeaId 빈 문자열 → success: false', async () => {
    const result = await saveWorksheetFromImport({
      fmeaId: '',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('fmeaId');
  });

  it('4-B. fmeaId 짧은 문자열 → success: false', async () => {
    const result = await saveWorksheetFromImport({
      fmeaId: 'ab',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(false);
  });

  it('5. buildWorksheetState 실패 → success: false', async () => {
    const { buildWorksheetState } = await import('@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState');
    vi.mocked(buildWorksheetState).mockReturnValueOnce({
      ...mockBuildResult,
      success: false,
    } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await saveWorksheetFromImport({
      fmeaId: 'test-fmea-005',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('빌드 실패');
    // API는 호출되지 않아야 함
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('6. fetch 네트워크 에러 → success: false + catch', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('NetworkError: Failed to fetch'));

    const result = await saveWorksheetFromImport({
      fmeaId: 'test-fmea-006',
      flatData: makeFlatData(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('NetworkError');
  });

  it('7. /api/fmea/save-from-import URL로 POST 호출 확인', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await saveWorksheetFromImport({
      fmeaId: 'test-fmea-007',
      flatData: makeFlatData(),
    });

    // /api/fmea/save-from-import 호출 확인
    const saveCall = mockFetch.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0] === '/api/fmea/save-from-import'
    );
    expect(saveCall).toBeDefined();
    expect(saveCall![1].method).toBe('POST');
  });

  it('8. 요청 body에 fmeaId, flatData 포함 확인', async () => {
    let capturedBody: Record<string, unknown> = {};
    global.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return { ok: true, json: async () => ({ success: true }) };
    });

    const flatData = makeFlatData();
    await saveWorksheetFromImport({
      fmeaId: 'TEST-FMEA-UPPER',
      flatData,
    });

    expect(capturedBody.fmeaId).toBe('TEST-FMEA-UPPER');
    expect(Array.isArray(capturedBody.flatData)).toBe(true);
    expect((capturedBody.flatData as unknown[]).length).toBe(3);
  });

  it('9. db-storage의 saveWorksheetDB 미사용 확인', async () => {
    const dbStorage = await import('@/app/(fmea-core)/pfmea/worksheet/db-storage');
    const spySaveDB = vi.spyOn(dbStorage, 'saveWorksheetDB');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await saveWorksheetFromImport({
      fmeaId: 'test-fmea-009',
      flatData: makeFlatData(),
    });

    expect(spySaveDB).not.toHaveBeenCalled();
  });
});
