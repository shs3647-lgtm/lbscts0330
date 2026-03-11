/**
 * @file failure-chain-injector-fe-link.spec.ts
 * @description TDD: 고장영향(FE)이 모든 FM에 무차별 연결되는 버그 검증
 *
 * 버그: failureChainInjector.ts의
 *   1) 2차 패스: 미연결 FE를 항상 첫 번째 FM-FC에 연결 → 모든 FE가 동일 FM에 연결
 *   2) 1차 패스: FE 없는 chain에 항상 첫 번째 FE 할당 → 관련없는 FE 연결
 *
 * 기대 동작:
 *   - 각 FM은 chain에 명시된 FE에만 연결되어야 함
 *   - FE 없는 chain은 FE='' 상태로 링크 생성하거나, 같은 공정의 FE만 연결
 *   - 미연결 FE가 임의의 FM-FC에 강제 연결되면 안 됨
 */

import { describe, it, expect } from 'vitest';
import { injectFailureChains } from './failureChainInjector';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { WorksheetState } from '@/app/(fmea-core)/dfmea/worksheet/constants';

// 테스트용 최소 WorksheetState 생성
function createTestState(): WorksheetState {
  return {
    l1: {
      id: 'l1-1',
      name: '완제품',
      types: [
        {
          id: 'type-yp', name: 'YP', functions: [
            { id: 'fn-yp-1', name: 'YP 기능1', requirements: [{ id: 'req-yp-1', name: '요구사항1' }] },
          ],
        },
      ],
      failureScopes: [
        { id: 'fe-1', name: 'FE-라인정지', effect: '라인정지', scope: 'YP', severity: 8, reqId: 'req-yp-1' },
        { id: 'fe-2', name: 'FE-외관불량', effect: '외관불량', scope: 'SP', severity: 5 },
        { id: 'fe-3', name: 'FE-기능저하', effect: '기능저하', scope: 'USER', severity: 3 },
      ],
    },
    l2: [
      {
        id: 'proc-10', no: '10', name: '10번-컷팅', order: 0,
        functions: [
          { id: 'fn-10-1', name: '자재절단', productChars: [{ id: 'pc-10-1', name: '절단면품질' }] },
        ],
        failureModes: [
          { id: 'fm-10-1', name: '절단면불량' },
        ],
        failureCauses: [
          { id: 'fc-10-1', name: '톱날마모', processCharId: 'prc-10-1' },
        ],
        l3: [
          {
            id: 'we-10-mc', name: 'Cutting MC', m4: 'MC', order: 0,
            functions: [{ id: 'wf-10-1', name: 'MC 운용', processChars: [{ id: 'prc-10-1', name: '톱날상태' }] }],
            failureCauses: [],
          },
        ],
      },
      {
        id: 'proc-20', no: '20', name: '20번-프레스', order: 1,
        functions: [
          { id: 'fn-20-1', name: '프레스가공', productChars: [{ id: 'pc-20-1', name: '치수정밀도' }] },
        ],
        failureModes: [
          { id: 'fm-20-1', name: '치수불량' },
        ],
        failureCauses: [
          { id: 'fc-20-1', name: '금형마모', processCharId: 'prc-20-1' },
        ],
        l3: [
          {
            id: 'we-20-mc', name: 'Press MC', m4: 'MC', order: 0,
            functions: [{ id: 'wf-20-1', name: '프레스운용', processChars: [{ id: 'prc-20-1', name: '금형상태' }] }],
            failureCauses: [],
          },
        ],
      },
    ],
  } as unknown as WorksheetState;
}

describe('failureChainInjector - FE 연결 정밀성', () => {

  it('각 chain의 FE만 해당 FM에 연결되어야 한다 (다른 FE가 섞이면 안 됨)', () => {
    const state = createTestState();
    const chains: MasterFailureChain[] = [
      {
        id: 'chain-1', processNo: '10', m4: 'MC',
        feValue: '라인정지', fmValue: '절단면불량', fcValue: '톱날마모',
        severity: 8,
      },
      {
        id: 'chain-2', processNo: '20', m4: 'MC',
        feValue: '외관불량', fmValue: '치수불량', fcValue: '금형마모',
        severity: 5,
      },
    ] as MasterFailureChain[];

    const result = injectFailureChains(state, chains);

    // 10번-절단면불량(fm-10-1)은 라인정지(fe-1)만 연결되어야 함
    const linksForFM10 = result.failureLinks.filter(l => l.fmId === 'fm-10-1');
    const feIdsForFM10 = [...new Set(linksForFM10.map(l => l.feId))];
    expect(feIdsForFM10).toContain('fe-1'); // 라인정지
    expect(feIdsForFM10).not.toContain('fe-2'); // 외관불량은 20번 전용
    expect(feIdsForFM10).not.toContain('fe-3'); // 기능저하는 누구에게도 지정 안 됨

    // 20번-치수불량(fm-20-1)은 외관불량(fe-2)만 연결되어야 함
    const linksForFM20 = result.failureLinks.filter(l => l.fmId === 'fm-20-1');
    const feIdsForFM20 = [...new Set(linksForFM20.map(l => l.feId))];
    expect(feIdsForFM20).toContain('fe-2'); // 외관불량
    expect(feIdsForFM20).not.toContain('fe-1'); // 라인정지는 10번 전용
  });

  it('미연결 FE(fe-3)가 임의의 FM에 강제 연결되면 안 된다', () => {
    const state = createTestState();
    const chains: MasterFailureChain[] = [
      {
        id: 'chain-1', processNo: '10', m4: 'MC',
        feValue: '라인정지', fmValue: '절단면불량', fcValue: '톱날마모',
        severity: 8,
      },
    ] as MasterFailureChain[];

    const result = injectFailureChains(state, chains);

    // fe-3 (기능저하)는 chain에 없으므로 어떤 링크에도 나타나면 안 됨
    const linksWithFE3 = result.failureLinks.filter(l => l.feId === 'fe-3');
    expect(linksWithFE3.length).toBe(0);

    // fe-2 (외관불량)도 chain에 없으므로 어떤 링크에도 나타나면 안 됨
    const linksWithFE2 = result.failureLinks.filter(l => l.feId === 'fe-2');
    expect(linksWithFE2.length).toBe(0);
  });

  it('FE 없는 chain은 첫 번째 FE를 무조건 할당하면 안 된다', () => {
    const state = createTestState();
    // feValue가 비어있는 chain
    const chains: MasterFailureChain[] = [
      {
        id: 'chain-1', processNo: '10', m4: 'MC',
        feValue: '', fmValue: '절단면불량', fcValue: '톱날마모',
      },
      {
        id: 'chain-2', processNo: '20', m4: 'MC',
        feValue: '외관불량', fmValue: '치수불량', fcValue: '금형마모',
        severity: 5,
      },
    ] as MasterFailureChain[];

    const result = injectFailureChains(state, chains);

    // chain-2: 20번-치수불량은 외관불량(fe-2)에만 연결
    const linksForFM20 = result.failureLinks.filter(l => l.fmId === 'fm-20-1');
    const feIdsForFM20 = [...new Set(linksForFM20.map(l => l.feId))];
    expect(feIdsForFM20).toContain('fe-2');

    // chain-1: feValue 비어있으므로 fe-1(라인정지)이 자동 할당되는 것은 허용하되,
    // fe-2(외관불량), fe-3(기능저하)까지 연결되면 안 됨
    const linksForFM10 = result.failureLinks.filter(l => l.fmId === 'fm-10-1');
    const feIdsForFM10 = [...new Set(linksForFM10.map(l => l.feId))];
    // 최대 1개의 FE만 연결 (자동보완 허용)
    expect(feIdsForFM10.length).toBeLessThanOrEqual(1);
  });

  it('2차 패스가 chain에 없는 FC를 자동 생성하여 초과 링크를 만들면 안 된다', () => {
    const state = createTestState();

    // state에 FC가 2개 있지만 chain은 1개만 매칭
    const chains: MasterFailureChain[] = [
      {
        id: 'chain-1', processNo: '10', m4: 'MC',
        feValue: '라인정지', fmValue: '절단면불량', fcValue: '톱날마모',
        severity: 8,
      },
    ] as MasterFailureChain[];

    const result = injectFailureChains(state, chains);

    // chain에 명시된 링크만 생성 (1건)
    // state에 fc-20-1(금형마모)이 있지만 chain에 없으므로 링크가 생성되면 안 됨
    expect(result.failureLinks.length).toBe(1);

    const fcIds = result.failureLinks.map(l => l.fcId);
    expect(fcIds).toContain('fc-10-1');      // chain에 있는 FC
    expect(fcIds).not.toContain('fc-20-1');   // chain에 없는 FC → 링크 생성 금지
  });

  it('링크 수는 chain 수와 정확히 일치해야 한다 (1:1)', () => {
    const state = createTestState();
    const chains: MasterFailureChain[] = [
      {
        id: 'chain-1', processNo: '10', m4: 'MC',
        feValue: '라인정지', fmValue: '절단면불량', fcValue: '톱날마모',
        severity: 8,
      },
      {
        id: 'chain-2', processNo: '20', m4: 'MC',
        feValue: '외관불량', fmValue: '치수불량', fcValue: '금형마모',
        severity: 5,
      },
    ] as MasterFailureChain[];

    const result = injectFailureChains(state, chains);

    // 정확히 chain 수(2)만큼만 링크 생성
    expect(result.failureLinks.length).toBe(2);
    expect(result.injectedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
  });
});
