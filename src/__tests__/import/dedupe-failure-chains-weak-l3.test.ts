import { describe, expect, it } from 'vitest';
import { dedupeFailureChainsWeakL3 } from '@/app/(fmea-core)/pfmea/import/utils/dedupeFailureChainsWeakL3';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

function ch(p: Partial<MasterFailureChain> & Pick<MasterFailureChain, 'id'>): MasterFailureChain {
  return {
    processNo: '10',
    feValue: 'fe',
    fmValue: 'fm',
    fcValue: 'fc',
    ...p,
  };
}

describe('dedupeFailureChainsWeakL3', () => {
  it('4M·작업요소가 모두 비어 있으면 동일 공정|FM|FC|FE 조합은 1건만 유지', () => {
    const chains: MasterFailureChain[] = [
      ch({ id: 'a', processNo: '01', fmValue: '파티클 초과', fcValue: '설비 가동률 저하', feValue: '불량' }),
      ch({ id: 'b', processNo: '01', fmValue: '파티클 초과', fcValue: '설비 가동률 저하', feValue: '불량' }),
      ch({ id: 'c', processNo: '01', fmValue: '파티클 초과', fcValue: '온습도 제어 이탈', feValue: '불량' }),
    ];
    const out = dedupeFailureChainsWeakL3(chains);
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('4M 또는 작업요소가 있으면 동일 텍스트라도 병합하지 않음', () => {
    const chains: MasterFailureChain[] = [
      ch({ id: 'a', m4: 'MC', workElement: '', fmValue: 'fm', fcValue: 'fc', feValue: 'fe' }),
      ch({ id: 'b', m4: 'MC', workElement: '', fmValue: 'fm', fcValue: 'fc', feValue: 'fe' }),
    ];
    expect(dedupeFailureChainsWeakL3(chains)).toHaveLength(2);
  });

  it('작업요소만 있어도 병합하지 않음', () => {
    const chains: MasterFailureChain[] = [
      ch({ id: 'a', workElement: 'WE1', fmValue: 'fm', fcValue: 'fc' }),
      ch({ id: 'b', workElement: 'WE1', fmValue: 'fm', fcValue: 'fc' }),
    ];
    expect(dedupeFailureChainsWeakL3(chains)).toHaveLength(2);
  });
});
