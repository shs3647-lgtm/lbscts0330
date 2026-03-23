/**
 * supplementChainsFromFlatData — FAVerificationBar 정합 (FM/FC 공정키, FE norm)
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

describe('supplementChainsFromFlatData', () => {
  it('동일 FM 문구·다른 공정 → 공정별로 FC 보충 행이 생긴다', () => {
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
    const keys = new Set(
      out.filter(c => c.fcValue?.trim()).map(c => `${c.processNo}|${c.fcValue?.trim()}`),
    );
    expect(keys.has('20|원인B')).toBe(true);
  });

  it('FE는 대소문자·공백 norm 기준으로 기존 chain과 같으면 supplement-fe 중복 안 함', () => {
    const chains: MasterFailureChain[] = [
      chain({
        id: 'c1',
        processNo: '10',
        fmValue: 'FM',
        fcValue: 'FC',
        feValue: 'Hello  World',
      }),
    ];
    const flat: ImportedFlatData[] = [
      { id: 'c4', processNo: 'YP', category: 'C', itemCode: 'C4', value: 'hello world' } as ImportedFlatData,
    ];
    const out = supplementChainsFromFlatData(chains, flat);
    const feOnly = out.filter(c => c.id.startsWith('supplement-fe'));
    expect(feOnly.length).toBe(0);
  });

  it('동일 공정·동일 FM 문구 A5가 flat에 2행이면 chain FM 슬롯 2개까지 multiset 보충', () => {
    const chains: MasterFailureChain[] = [
      chain({
        id: 'c1',
        processNo: '10',
        fmValue: '치수불량',
        fcValue: '원인1',
        feValue: 'FE1',
      }),
    ];
    const flat: ImportedFlatData[] = [
      { id: 'a5a', processNo: '10', category: 'A', itemCode: 'A5', value: '치수불량', excelRow: 5 } as ImportedFlatData,
      { id: 'a5b', processNo: '10', category: 'A', itemCode: 'A5', value: '치수불량', excelRow: 6 } as ImportedFlatData,
    ];
    const out = supplementChainsFromFlatData(chains, flat);
    const fmSup = out.filter(c => c.id.startsWith('supplement-fm'));
    expect(fmSup.length).toBe(1);
  });

  it('동일 공정·동일 FC 문구 B4가 flat에 2행이면 multiset으로 FC 보충 1건 추가', () => {
    const chains: MasterFailureChain[] = [
      chain({
        id: 'c1',
        processNo: '10',
        fmValue: 'FM',
        fcValue: '동일원인',
        feValue: 'FE',
      }),
    ];
    const flat: ImportedFlatData[] = [
      { id: 'b4a', processNo: '10', category: 'B', itemCode: 'B4', value: '동일원인', m4: 'MC', excelRow: 3 } as ImportedFlatData,
      { id: 'b4b', processNo: '10', category: 'B', itemCode: 'B4', value: '동일원인', m4: 'MC', excelRow: 4 } as ImportedFlatData,
    ];
    const out = supplementChainsFromFlatData(chains, flat);
    const fcSup = out.filter(c => c.id.startsWith('supplement-fc'));
    expect(fcSup.length).toBe(1);
  });

  it('chain에 없는 C4 텍스트(norm)는 supplement-fe 1행 추가', () => {
    const chains: MasterFailureChain[] = [
      chain({
        id: 'c1',
        processNo: '10',
        fmValue: 'FM',
        fcValue: 'FC',
        feValue: '있는영향',
      }),
    ];
    const flat: ImportedFlatData[] = [
      { id: 'c4a', processNo: 'YP', category: 'C', itemCode: 'C4', value: '있는영향' } as ImportedFlatData,
      { id: 'c4b', processNo: 'USER', category: 'C', itemCode: 'C4', value: '새로운불량영향' } as ImportedFlatData,
    ];
    const out = supplementChainsFromFlatData(chains, flat);
    const feExtra = out.filter(c => c.id.startsWith('supplement-fe') && c.feValue === '새로운불량영향');
    expect(feExtra.length).toBe(1);
  });
});
