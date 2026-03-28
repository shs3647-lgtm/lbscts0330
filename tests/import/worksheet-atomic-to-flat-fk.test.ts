/**
 * FMEAWorksheetDB → import/utils/atomicToFlatData → verifyFK (C2→C1, A3/A4→A1, B3→B2)
 */
import { describe, it, expect } from 'vitest';
import { atomicToFlatData } from '@/app/(fmea-core)/pfmea/import/utils/atomicToFlatData';
import { verifyFK } from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';
import { createEmptyDB, type FMEAWorksheetDB, type L1Function, type L2Structure, type L2Function, type L3Structure, type L3Function } from '@/app/(fmea-core)/pfmea/worksheet/schema';

const FID = 'pfm26-m-wsfk';

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
    processChar: '',
  };
  db.l3Functions = [l3f];

  return db;
}

describe('worksheet atomicToFlatData FK', () => {
  it('C2.parentItemId = C1, A3·A4.parentItemId = A1 행 id, B3.parentItemId = B2', () => {
    const { flatData } = atomicToFlatData(minimalDb(), { fmeaId: FID });
    const fk = verifyFK(flatData);

    expect(fk.C2.orphans).toBe(0);
    expect(fk.A3.orphans).toBe(0);
    expect(fk.A4.orphans).toBe(0);
    expect(fk.B3.orphans).toBe(0);

    const c1 = flatData.find(x => x.itemCode === 'C1');
    const c2 = flatData.find(x => x.itemCode === 'C2');
    expect(c1?.id).toBeTruthy();
    expect(c2?.parentItemId).toBe(c1?.id);

    const a1 = flatData.find(x => x.itemCode === 'A1' && x.processNo === '10');
    const a3 = flatData.find(x => x.itemCode === 'A3' && x.processNo === '10');
    const a4 = flatData.find(x => x.itemCode === 'A4' && x.processNo === '10');
    expect(a3?.parentItemId).toBe(a1?.id);
    expect(a4?.parentItemId).toBe(a1?.id);

    const b2 = flatData.find(x => x.itemCode === 'B2' && x.processNo === '10');
    const b3 = flatData.find(x => x.itemCode === 'B3' && x.processNo === '10');
    expect(b3?.parentItemId).toBe(b2?.id);
  });
});
