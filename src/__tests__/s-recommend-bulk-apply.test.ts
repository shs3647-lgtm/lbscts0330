/**
 * S추천 일괄: 매핑 우선순위 (DB표 → 키워드)
 * ★ 2026-03-28: localStorage → Public DB (fetch mock)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { L1Data } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { applyBulkSeverityRecommendations } from '@/lib/fmea/s-recommend-bulk-apply';

describe('applyBulkSeverityRecommendations', () => {
  const fmeaId = 'test-fmea-srec';

  beforeEach(() => {
    // ★ DB API mock (fetch → /api/severity-recommend)
    const dbRecords = [
      {
        id: 'm1',
        feText: '수율 테스트 FE',
        severity: 7,
        feCategory: 'YP',
        processName: 'F',
        productChar: 'REQ',
        usageCount: 3,
      },
    ];
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: dbRecords }),
      }),
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('매핑표가 키워드보다 우선하여 S·근거 반영', async () => {
    const l1: L1Data = {
      id: 'l1',
      name: 'N',
      types: [
        {
          id: 't1',
          name: 'YP',
          functions: [
            {
              id: 'fn1',
              name: 'F',
              requirements: [{ id: 'req1', name: 'REQ' }],
            },
          ],
        },
      ],
      failureScopes: [
        {
          id: 'fe1',
          reqId: 'req1',
          effect: '수율 테스트 FE',
          severity: 1,
        } as any,
      ],
    };

    const { changeCount, updatedScopes } = await applyBulkSeverityRecommendations(l1, fmeaId);
    expect(changeCount).toBe(1);
    const u = updatedScopes.find((s: any) => s.id === 'fe1');
    expect(u?.severity).toBe(7);
    expect((u as any)?.severityRationale).toContain('DB');
  });
});
