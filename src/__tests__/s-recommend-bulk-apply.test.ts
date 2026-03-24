/**
 * S추천 일괄: 매핑 우선순위 (표 → 키워드)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { L1Data } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { applyBulkSeverityRecommendations } from '@/lib/fmea/s-recommend-bulk-apply';

describe('applyBulkSeverityRecommendations', () => {
  const fmeaId = 'test-fmea-srec';

  beforeEach(() => {
    const rows = [
      {
        id: 'm1',
        scope: 'YP',
        productFunction: 'F',
        requirement: 'REQ',
        failureEffect: '수율 테스트 FE',
        severity: 7,
        basis: '매핑표 근거 문구',
      },
    ];
    vi.stubGlobal('localStorage', {
      getItem: (k: string) =>
        k.includes('test-fmea-srec') ? JSON.stringify(rows) : null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('매핑표가 키워드보다 우선하여 S·근거 반영', () => {
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

    const { changeCount, updatedScopes } = applyBulkSeverityRecommendations(l1, fmeaId);
    expect(changeCount).toBe(1);
    const u = updatedScopes.find((s: any) => s.id === 'fe1');
    expect(u?.severity).toBe(7);
    expect((u as any)?.severityRationale).toBe('매핑표 근거 문구');
  });
});
