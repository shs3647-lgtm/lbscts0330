/**
 * supplementChainsFromFlatData — FC 시트 기반 체인만 유지 (합성 보충 비활성화)
 */
import { describe, it, expect } from 'vitest';
import { supplementChainsFromFlatData } from '@/app/(fmea-core)/pfmea/import/utils/supplementChainsFromFlatData';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

function chain(partial: Partial<MasterFailureChain> & Pick<MasterFailureChain, 'id' | 'processNo'>): MasterFailureChain {
  return {
    feValue: '',
    fmValue: '',
    fcValue: '',
    ...partial,
  };
}

describe('supplementChainsFromFlatData (noop — 사실 기반 FC만)', () => {
  it('flat에만 있는 A5/B4/C4가 있어도 체인을 늘리지 않는다', () => {
    const chains: MasterFailureChain[] = [
      chain({
        id: 'c1',
        processNo: '10',
        fmValue: '표면 불량',
        fcValue: '원인A',
        feValue: '영향1',
      }),
    ];
    const flat: ImportedFlatData[] = [
      { id: 'a', processNo: '20', category: 'A', itemCode: 'A5', value: '표면 불량' } as ImportedFlatData,
      { id: 'b', processNo: '20', category: 'B', itemCode: 'B4', value: '원인B' } as ImportedFlatData,
    ];
    const out = supplementChainsFromFlatData(chains, flat);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('c1');
  });

  it('입력 chains와 동일 길이·동일 id 순서 (얕은 복사)', () => {
    const chains: MasterFailureChain[] = [
      chain({ id: 'a', processNo: '1', fmValue: 'm', fcValue: 'c', feValue: 'e' }),
      chain({ id: 'b', processNo: '2', fmValue: 'm2', fcValue: 'c2', feValue: 'e2' }),
    ];
    const out = supplementChainsFromFlatData(chains, []);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
    expect(out).not.toBe(chains);
  });
});
