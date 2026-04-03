import { describe, expect, it } from 'vitest';
import { atomicToFlatData } from '@/app/(fmea-core)/pfmea/import/utils/atomicToFlatData';
import { enrichImportedFlatWithDedupKeys } from '@/lib/fmea/utils/flat-dedup-key-enrich';
import {
  createEmptyDB,
  type FMEAWorksheetDB,
  type L1Function,
  type L2Structure,
  type L2Function,
  type L3Structure,
  type L3Function,
  type FailureMode,
} from '@/app/(fmea-core)/pfmea/worksheet/schema';
import {
  dedupKey_FL_FM,
  dedupKey_FN_L2,
  dedupKey_ST_L2,
} from '@/lib/fmea/utils/dedup-key';

const FID = 'pfm26-m-enrich';

function minimalDb(): FMEAWorksheetDB {
  const db = createEmptyDB(FID);
  db.l1Structure = { id: 'l1s', fmeaId: FID, name: '제품' };
  const lf: L1Function = {
    id: 'lf-1',
    fmeaId: FID,
    l1StructId: 'l1s',
    category: 'Your Plant',
    functionName: '기능1',
    requirement: '요구1',
  };
  db.l1Functions = [lf];
  const l2: L2Structure = { id: 'l2-1', fmeaId: FID, l1Id: 'l1s', no: '10', name: '공정A', order: 1 };
  db.l2Structures = [l2];
  const l2f: L2Function = {
    id: 'l2f-1',
    fmeaId: FID,
    l2StructId: 'l2-1',
    functionName: '2L기능',
    productChar: '특성1',
  };
  db.l2Functions = [l2f];
  const l3: L3Structure = { id: 'l3-1', fmeaId: FID, l1Id: 'l1s', l2Id: 'l2-1', name: 'WE1', m4: 'MN', order: 1 };
  db.l3Structures = [l3];
  const l3f: L3Function = {
    id: 'l3f-1',
    fmeaId: FID,
    l3StructId: 'l3-1',
    functionName: '3L기능',
    processChar: 'B3x',
  };
  db.l3Functions = [l3f];
  const fm: FailureMode = {
    id: 'fm-1',
    fmeaId: FID,
    l2FuncId: 'l2f-1',
    l2StructId: 'l2-1',
    productCharId: 'l2f-1',
    mode: 'FM1',
  };
  db.failureModes = [fm];
  return db;
}

describe('enrichImportedFlatWithDedupKeys', () => {
  it('atomicToFlatData 결과에 dedupKey를 채운다 (워크시트 역변환)', () => {
    const { flatData: raw } = atomicToFlatData(minimalDb(), { fmeaId: FID });
    const withKeys = enrichImportedFlatWithDedupKeys(
      raw.map(({ dedupKey: _d, ...r }) => r as import('@/app/(fmea-core)/pfmea/import/types').ImportedFlatData),
    );

    const a1 = withKeys.find((r) => r.itemCode === 'A1');
    const stL1Root = withKeys.find((r) => r.itemCode === 'C2')?.parentItemId ?? 'WS-L1-ROOT';
    expect(a1?.dedupKey).toBe(dedupKey_ST_L2(stL1Root, '10'));

    const a4 = withKeys.find((r) => r.itemCode === 'A4');
    const a1Row = withKeys.find((r) => r.itemCode === 'A1' && r.processNo === '10');
    expect(a4?.dedupKey).toBe(dedupKey_FN_L2(a1Row?.id ?? '', '__EMPTY__', a4?.id ?? ''));

    const a5 = withKeys.find((r) => r.itemCode === 'A5');
    expect(a5?.dedupKey).toBe(dedupKey_FL_FM(a4?.id ?? '', a5?.value ?? ''));
  });

  it('이미 dedupKey가 있으면 덮어쓰지 않는다', () => {
    const rows = [
      {
        id: 'x',
        processNo: '1',
        category: 'A' as const,
        itemCode: 'A1',
        value: '1',
        createdAt: new Date(),
        dedupKey: 'KEEP-ME',
      },
    ];
    const out = enrichImportedFlatWithDedupKeys(rows);
    expect(out[0].dedupKey).toBe('KEEP-ME');
  });
});
