import { describe, expect, it } from 'vitest';
import { buildFaVerificationVerifyRows } from '@/app/(fmea-core)/pfmea/import/utils/faVerificationMetrics';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import { isFaVerifyRowPass } from '@/app/(fmea-core)/pfmea/import/utils/faVerificationSpecRelax';

function chain(p: Partial<MasterFailureChain> & Pick<MasterFailureChain, 'id'>): MasterFailureChain {
  return {
    processNo: '10',
    feValue: 'fe',
    fmValue: 'fm',
    fcValue: 'fc',
    ...p,
  };
}

describe('buildFaVerificationVerifyRows', () => {
  it('행4 FC합계: VERIFY fcCount 무시하고 평면 고유 B4(fdFC)를 기대값으로 사용', () => {
    const flat: ImportedFlatData[] = [];
    for (let i = 0; i < 115; i++) {
      flat.push({
        id: `b4-${i}`,
        processNo: String(10 + (i % 3)),
        category: 'B',
        itemCode: 'B4',
        value: `원인-${i}`,
        m4: 'MC',
        createdAt: new Date(),
      });
    }
    const chains: MasterFailureChain[] = Array.from({ length: 136 }, (_, i) =>
      chain({
        id: `fl-${i}`,
        processNo: String(10 + (i % 3)),
        fmValue: `FM-${i % 20}`,
        fcValue: `원인-${i % 115}`,
        feValue: `FE-${i % 16}`,
        m4: 'MC',
      }),
    );
    const rows = buildFaVerificationVerifyRows(chains, undefined, flat);
    const r4 = rows.find((r) => r.no === 4)!;
    expect(r4.actual).toBe(115);
    expect(r4.expected).toBe(115);
    expect(isFaVerifyRowPass(4, r4.actual, r4.expected)).toBe(true);
  });

  it('행6·7: 동일 FM/FC가 여러 체인 행이면 시맨틱 집계로 메인 A5·B4 건수와 일치', () => {
    const flat: ImportedFlatData[] = [];
    for (let p = 1; p <= 26; p++) {
      flat.push({
        id: `a5-${p}`,
        processNo: String(p),
        category: 'A',
        itemCode: 'A5',
        value: `고장형태-${p}`,
        createdAt: new Date(),
      });
      flat.push({
        id: `b4-${p}`,
        processNo: String(p),
        category: 'B',
        itemCode: 'B4',
        value: `원인-${p}`,
        m4: 'MC',
        createdAt: new Date(),
      });
    }
    const chains: MasterFailureChain[] = Array.from({ length: 120 }, (_, i) => {
      const p = (i % 26) + 1;
      return chain({
        id: `c-${i}`,
        excelRow: 100 + i,
        processNo: String(p),
        fmValue: `고장형태-${p}`,
        fcValue: `원인-${p}`,
        feValue: '공통FE',
        m4: 'MC',
      });
    });
    const rows = buildFaVerificationVerifyRows(chains, undefined, flat);
    const r6 = rows.find((r) => r.no === 6)!;
    const r7 = rows.find((r) => r.no === 7)!;
    expect(r6.actual).toBe(26);
    expect(r6.expected).toBe(26);
    expect(r7.actual).toBe(26);
    expect(r7.expected).toBe(26);
    expect(isFaVerifyRowPass(6, r6.actual, r6.expected)).toBe(true);
    expect(isFaVerifyRowPass(7, r7.actual, r7.expected)).toBe(true);
  });
});
