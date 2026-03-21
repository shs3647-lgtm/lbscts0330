/**
 * B2/B3 개수 불일치 시 L3Function.id가 B3.id로 고정되는지 검증 (m100 orphanPC 6건 원인 회귀 방지).
 * pipeline-verify STEP4 orphanPC 정의와 동일하게 계산.
 */
import { describe, it, expect } from 'vitest';
import { buildAtomicFromFlat } from '@/app/(fmea-core)/pfmea/import/utils/buildAtomicFromFlat';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { StepBMasterChain } from '@/app/(fmea-core)/pfmea/import/stepb-parser/types';
import {
  genA1,
  genA3,
  genA4,
  genA5,
  genB1,
  genB2,
  genB3,
  genB4,
  genC2,
  genC3,
  genC4,
} from '@/lib/uuid-generator';

const now = new Date();

function fd(
  o: Pick<ImportedFlatData, 'id' | 'processNo' | 'category' | 'itemCode' | 'value'> &
    Partial<ImportedFlatData>
): ImportedFlatData {
  return { createdAt: now, ...o };
}

/** pipeline-verify verifyStep4과 동일 orphanPC 카운트 */
function countOrphanPcLikePipeline(
  l3Funcs: { id: string; processChar?: string; functionName?: string }[],
  fcs: { l3FuncId?: string | null; processCharId?: string | null }[]
): number {
  const fcL3FuncIds = new Set(fcs.map(fc => fc.l3FuncId).filter(Boolean) as string[]);
  const fcPcIds = new Set(fcs.map(fc => fc.processCharId).filter(Boolean) as string[]);
  return l3Funcs.filter(
    f =>
      f.processChar?.trim() &&
      !fcL3FuncIds.has(f.id) &&
      !fcPcIds.has(f.id) &&
      !f.id.endsWith('-L3F')
  ).length;
}

describe('buildAtomicFromFlat B2/B3 pairing', () => {
  it('B2 2건 · B3 1건일 때 L3Function.id는 B3.id이고 B4가 참조하는 PC는 orphan이 아님', () => {
    const pno = '1';
    const l2Id = genA1('PF', 1);
    const a3Id = genA3('PF', 1, 1);
    const a4Id = genA4('PF', 1, 1);
    const a5Id = genA5('PF', 1, 1);
    const b1Id = genB1('PF', 1, 'EN', 1);
    const b2First = genB2('PF', 1, 'EN', 1, 1); // …-G
    const b2Second = genB2('PF', 1, 'EN', 1, 2); // …-G-002
    const b3Id = genB3('PF', 1, 'EN', 1, 1); // …-C-001
    const b4Id = genB4('PF', 1, 'EN', 1, 1);

    const c2Id = genC2('PF', 'YP', 1);
    const c3Id = genC3('PF', 'YP', 1, 1);
    const c4Id = genC4('PF', 'YP', 1, 1, 1);

    const flat: ImportedFlatData[] = [
      fd({ id: l2Id, processNo: pno, category: 'A', itemCode: 'A1', value: pno }),
      fd({ id: `${l2Id}-name`, processNo: pno, category: 'A', itemCode: 'A2', value: '공정1' }),
      fd({ id: a3Id, processNo: pno, category: 'A', itemCode: 'A3', value: '공정기능', parentItemId: l2Id }),
      fd({ id: a4Id, processNo: pno, category: 'A', itemCode: 'A4', value: '제품특성', parentItemId: a3Id }),
      fd({ id: a5Id, processNo: pno, category: 'A', itemCode: 'A5', value: '고장형태', parentItemId: a4Id }),

      fd({ id: b1Id, processNo: pno, category: 'B', itemCode: 'B1', value: 'WE1', m4: 'EN' }),
      fd({ id: b2First, processNo: pno, category: 'B', itemCode: 'B2', value: '요소기능1', parentItemId: b1Id, m4: 'EN' }),
      fd({ id: b2Second, processNo: pno, category: 'B', itemCode: 'B2', value: '요소기능2', parentItemId: b1Id, m4: 'EN' }),
      fd({ id: b3Id, processNo: pno, category: 'B', itemCode: 'B3', value: '공정특성텍스트', parentItemId: b1Id, m4: 'EN' }),
      fd({
        id: b4Id,
        processNo: pno,
        category: 'B',
        itemCode: 'B4',
        value: '고장원인',
        parentItemId: b3Id,
        m4: 'EN',
      }),

      fd({ id: c2Id, processNo: 'YP', category: 'C', itemCode: 'C2', value: 'C2기능' }),
      fd({ id: c3Id, processNo: 'YP', category: 'C', itemCode: 'C3', value: '요구', parentItemId: c2Id }),
      fd({ id: c4Id, processNo: 'YP', category: 'C', itemCode: 'C4', value: '고장영향', parentItemId: c3Id }),
    ];

    const chains: StepBMasterChain[] = [
      {
        processNo: pno,
        m4: 'EN',
        fcValue: '고장원인',
        fmValue: '고장형태',
        feValue: '고장영향',
        pcValue: '',
        dcValue: '',
        feScope: 'YP',
        s: 5,
        o: 5,
        d: 5,
        ap: 'M',
        fmId: a5Id,
        feId: c4Id,
        fcId: b4Id,
      },
    ];

    const db = buildAtomicFromFlat({ fmeaId: 'pfm26-m100', flatData: flat, chains });

    const withPc = db.l3Functions.filter(f => f.processChar?.trim());
    expect(withPc.length).toBe(1);
    expect(withPc[0].id).toBe(b3Id);
    expect(withPc[0].processChar).toBe('공정특성텍스트');

    const orphan = countOrphanPcLikePipeline(db.l3Functions, db.failureCauses);
    expect(orphan).toBe(0);

    const extraB2 = db.l3Functions.find(f => f.id === b2Second);
    expect(extraB2).toBeDefined();
    expect(extraB2?.processChar).toBe('');
  });
});
