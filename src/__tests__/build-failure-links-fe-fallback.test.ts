/**
 * @file build-failure-links-fe-fallback.test.ts
 * @description buildFailureLinksDBCentric — 글로벌 FE 폴백이 round-robin이 아닌 단일 캐노니컬 FE인지 검증
 * @created 2026-03-23
 */

import { describe, it, expect } from 'vitest';
import { buildFailureLinksDBCentric } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

function minimalStateForProc20(): WorksheetState {
  return {
    l1: {
      type: 'PFMEA',
      productName: 'T',
      failureScopes: [
        { id: 'fe-aaa', name: 'FE-01', scope: 'YP', effect: '영향-01', severity: 5 },
        { id: 'fe-bbb', name: 'FE-02', scope: 'YP', effect: '영향-02', severity: 5 },
      ],
      functions: [],
    },
    l2: [
      {
        no: '20',
        name: 'P20',
        functions: [],
        failureModes: [{ id: 'fm-x', name: 'FM-X' }],
        l3: [
          {
            id: 'we-mc',
            name: 'WE',
            m4: 'MC',
            functions: [],
            failureCauses: [
              { id: 'fc-1', name: 'FC-1' },
              { id: 'fc-2', name: 'FC-2' },
              { id: 'fc-3', name: 'FC-3' },
            ],
          },
        ],
        failureCauses: [],
      },
    ],
    failureLinks: [],
    riskData: {},
    specialCharacteristics: {},
    confirmedState: {},
  } as unknown as WorksheetState;
}

describe('buildFailureLinksDBCentric FE 글로벌 폴백', () => {
  it('feId 없는 동일 공정 다수 체인 → 모두 failureScopes[0] (fe-aaa), fe-bbb로 분산 안 함', () => {
    const state = minimalStateForProc20();
    const chains: MasterFailureChain[] = [
      {
        id: 'c1',
        processNo: '20',
        fmValue: 'FM-X',
        fcValue: 'FC-1',
        feValue: '',
        fmId: 'fm-x',
        fcId: 'fc-1',
        m4: 'MC',
      },
      {
        id: 'c2',
        processNo: '20',
        fmValue: 'FM-X',
        fcValue: 'FC-2',
        feValue: '',
        fmId: 'fm-x',
        fcId: 'fc-2',
        m4: 'MC',
      },
      {
        id: 'c3',
        processNo: '20',
        fmValue: 'FM-X',
        fcValue: 'FC-3',
        feValue: '',
        fmId: 'fm-x',
        fcId: 'fc-3',
        m4: 'MC',
      },
    ];

    const { failureLinks } = buildFailureLinksDBCentric(state, chains);

    expect(failureLinks.length).toBe(3);
    const feIds = new Set(failureLinks.map(l => l.feId));
    expect(feIds.size).toBe(1);
    expect(feIds.has('fe-aaa')).toBe(true);
    expect(chains.every(c => c.feId === 'fe-aaa')).toBe(true);
  });

  it('FC-only 체인이 먼저 feId만 갖추면 공정 carry 시드로 이후 FM+FC 체인이 같은 FE 사용', () => {
    const state = minimalStateForProc20();
    const chains: MasterFailureChain[] = [
      {
        id: 'c0',
        processNo: '20',
        fmValue: '',
        fcValue: 'FC-1',
        feValue: '임의',
        fcId: 'fc-1',
        feId: 'fe-bbb',
        m4: 'MC',
      },
      {
        id: 'c1',
        processNo: '20',
        fmValue: 'FM-X',
        fcValue: 'FC-2',
        feValue: '',
        fmId: 'fm-x',
        fcId: 'fc-2',
        m4: 'MC',
      },
    ];

    const { failureLinks } = buildFailureLinksDBCentric(state, chains);

    expect(chains[1]!.feId).toBe('fe-bbb');
    expect(failureLinks.length).toBe(1);
    expect(failureLinks[0]!.feId).toBe('fe-bbb');
  });
});
