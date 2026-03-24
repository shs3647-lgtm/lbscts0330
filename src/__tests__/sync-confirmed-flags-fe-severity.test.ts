/**
 * S추천 → 저장 경로: failureScopes[id].severity 가 failureEffects[id].severity 로 역동기화되는지
 */
import { describe, it, expect } from 'vitest';
import { syncConfirmedFlags } from '@/app/(fmea-core)/pfmea/worksheet/hooks/useWorksheetSave';
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';

describe('syncConfirmedFlags — failureScopes → failureEffects severity', () => {
  it('matches FE row by id and copies recommended severity', () => {
    const db = {
      fmeaId: 'pfm26-m107',
      confirmed: {} as FMEAWorksheetDB['confirmed'],
      l1Functions: [],
      failureEffects: [
        {
          id: 'fe-1',
          fmeaId: 'pfm26-m107',
          l1FuncId: 'l1f-1',
          category: 'YP',
          effect: '수율 저하',
          severity: 4,
        },
      ],
    } as unknown as FMEAWorksheetDB;

    const state = {
      l1: {
        types: [],
        failureScopes: [{ id: 'fe-1', effect: '수율 저하', severity: 7 }],
      },
    } as unknown as WorksheetState;

    const out = syncConfirmedFlags(db, state);
    expect(out.failureEffects?.[0]?.severity).toBe(7);
  });
});
