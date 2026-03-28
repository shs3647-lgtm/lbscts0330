import { describe, expect, it } from 'vitest';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import {
  buildFailureChainPreviewRenderRows,
  compareChainsForFcDisplay,
} from '@/app/(fmea-core)/pfmea/import/components/failureChainPreviewModel';

function chain(partial: Partial<MasterFailureChain> & Pick<MasterFailureChain, 'id'>): MasterFailureChain {
  return {
    processNo: '',
    feValue: '',
    fmValue: '',
    fcValue: '',
    ...partial,
  };
}

describe('failureChainPreviewModel', () => {
  it('sorts by processNo (numeric), then FM, FE, FC', () => {
    const rows: MasterFailureChain[] = [
      chain({ id: '1', processNo: '20', fmValue: 'Z', feValue: 'a', fcValue: 'x' }),
      chain({ id: '2', processNo: '100', fmValue: 'A', feValue: 'b', fcValue: 'y' }),
      chain({ id: '3', processNo: '20', fmValue: 'A', feValue: 'b', fcValue: 'z' }),
    ];
    const sorted = [...rows].sort(compareChainsForFcDisplay);
    expect(sorted.map((r) => r.id)).toEqual(['3', '1', '2']);
  });

  it('does not merge FE구분 across different FMs with same scope', () => {
    const rows: MasterFailureChain[] = [
      chain({
        id: 'a',
        processNo: '100',
        feScope: 'SP',
        feValue: 'FE-포장',
        fmValue: 'FM-포장',
        fcValue: 'FC1',
      }),
      chain({
        id: 'b',
        processNo: '100',
        feScope: 'SP',
        feValue: 'FE-AVI',
        fmValue: 'FM-AVI',
        fcValue: 'FC2',
      }),
    ];
    const rendered = buildFailureChainPreviewRenderRows(rows);
    expect(rendered).toHaveLength(2);
    expect(rendered[0].scopeRowSpan).toBe(1);
    expect(rendered[0].showScope).toBe(true);
    expect(rendered[1].scopeRowSpan).toBe(1);
    expect(rendered[1].showScope).toBe(true);
    expect(rendered[0].fmRowSpan).toBe(1);
    expect(rendered[1].fmRowSpan).toBe(1);
  });

  it('merges 공정+FM for n FC rows; merges scope within FM block only', () => {
    const rows: MasterFailureChain[] = [
      chain({
        id: '1',
        processNo: '200',
        feScope: 'SP',
        feValue: '고객 Packing',
        fmValue: '포장 불량',
        fcValue: '진공 누설',
      }),
      chain({
        id: '2',
        processNo: '200',
        feScope: 'SP',
        feValue: '고객 Packing',
        fmValue: '포장 불량',
        fcValue: '자재 품질',
      }),
      chain({
        id: '3',
        processNo: '200',
        feScope: 'SP',
        feValue: '고객 Packing',
        fmValue: '포장 불량',
        fcValue: '환경 이탈',
      }),
    ];
    const rendered = buildFailureChainPreviewRenderRows(rows);
    expect(rendered).toHaveLength(3);
    expect(rendered[0].processRowSpan).toBe(3);
    expect(rendered[0].fmRowSpan).toBe(3);
    expect(rendered[0].scopeRowSpan).toBe(3);
    expect(rendered[0].feRowSpan).toBe(3);
    expect(rendered[1].showProcess).toBe(false);
    expect(rendered[1].showFm).toBe(false);
    expect(rendered[1].showScope).toBe(false);
    expect(rendered[1].showFe).toBe(false);
  });
});
