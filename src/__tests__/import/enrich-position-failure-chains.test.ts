import { describe, expect, it } from 'vitest';
import {
  dedupeFailureChainsByFkTriplet,
  enrichPositionChainsFromAtomicData,
} from '@/app/(fmea-core)/pfmea/import/utils/enrichPositionFailureChains';
import type { PositionAtomicData } from '@/types/position-import';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

function minimalAtomic(overrides: {
  l3: { id: string; m4?: string; name: string; l2Id: string };
  cause: { id: string; l3StructId: string; l2StructId: string; l3FuncId: string; parentId: string };
}): PositionAtomicData {
  const base: PositionAtomicData = {
    fmeaId: 't',
    l1Structure: { id: 'l1', fmeaId: 't', name: 'root' },
    l1Functions: [],
    l1Requirements: [],
    l1Scopes: [],
    l2Structures: [
      { id: overrides.l3.l2Id, fmeaId: 't', l1Id: 'l1', parentId: 'l1', no: '01', name: 'P', order: 0 },
    ],
    l2Functions: [],
    l2ProcessNos: [],
    l2ProcessNames: [],
    l2SpecialChars: [],
    l3Structures: [
      {
        id: overrides.l3.id,
        fmeaId: 't',
        l1Id: 'l1',
        l2Id: overrides.l3.l2Id,
        parentId: overrides.l3.l2Id,
        m4: overrides.l3.m4,
        name: overrides.l3.name,
        order: 0,
      },
    ],
    l3Functions: [],
    l3ProcessChars: [],
    l3ProcessNos: [],
    l3FourMs: [],
    l3WorkElements: [],
    l3SpecialChars: [],
    processProductChars: [],
    failureEffects: [],
    failureModes: [],
    failureCauses: [
      {
        id: overrides.cause.id,
        fmeaId: 't',
        l3FuncId: overrides.cause.l3FuncId,
        l3StructId: overrides.cause.l3StructId,
        l2StructId: overrides.cause.l2StructId,
        parentId: overrides.cause.parentId,
        cause: '원인A',
      },
    ],
    failureLinks: [],
    riskAnalyses: [],
    stats: {},
  };
  return base;
}

describe('enrichPositionChainsFromAtomicData', () => {
  it('FC 시트에 m4·WE가 비어 있어도 fcId→L3Structure로 4M·작업요소를 채운다', () => {
    const l3Id = 'L3-R5';
    const l2Id = 'L2-R2';
    const fcId = 'L3-R5-C7';
    const data = minimalAtomic({
      l3: { id: l3Id, m4: 'MC', name: '세정조', l2Id },
      cause: { id: fcId, l3StructId: l3Id, l2StructId: l2Id, l3FuncId: 'lf', parentId: 'lf' },
    });

    const chains: MasterFailureChain[] = [
      {
        id: 'FL-1',
        processNo: '01',
        fmValue: 'FM',
        fcValue: '원인A',
        feValue: 'FE',
        fcId,
        fmId: 'fm1',
        feId: 'fe1',
      },
    ];

    const out = enrichPositionChainsFromAtomicData(chains, data);
    expect(out[0]!.m4).toBe('MC');
    expect(out[0]!.workElement).toBe('세정조');
  });

  it('FC 시트 값이 있으면 덮어쓰지 않는다', () => {
    const l3Id = 'L3-R5';
    const l2Id = 'L2-R2';
    const fcId = 'L3-R5-C7';
    const data = minimalAtomic({
      l3: { id: l3Id, m4: 'MC', name: 'L3이름', l2Id },
      cause: { id: fcId, l3StructId: l3Id, l2StructId: l2Id, l3FuncId: 'lf', parentId: 'lf' },
    });

    const chains: MasterFailureChain[] = [
      {
        id: 'FL-1',
        processNo: '01',
        fmValue: 'FM',
        fcValue: '원인A',
        feValue: 'FE',
        m4: 'MN',
        workElement: '시트WE',
        fcId,
        fmId: 'fm1',
        feId: 'fe1',
      },
    ];

    const out = enrichPositionChainsFromAtomicData(chains, data);
    expect(out[0]!.m4).toBe('MN');
    expect(out[0]!.workElement).toBe('시트WE');
  });
});

describe('dedupeFailureChainsByFkTriplet', () => {
  it('동일 fcId|fmId|feId는 1건만 남긴다', () => {
    const a: MasterFailureChain = {
      id: 'a',
      processNo: '1',
      fmValue: 'f',
      fcValue: 'c',
      feValue: 'e',
      fcId: 'fc',
      fmId: 'fm',
      feId: 'fe',
    };
    const b: MasterFailureChain = { ...a, id: 'b' };
    expect(dedupeFailureChainsByFkTriplet([a, b])).toHaveLength(1);
  });
});
