import type { FMEAWorksheetDB } from '@/app/pfmea/worksheet/schema';

type FlatItemInput = {
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  sourceFmeaId?: string;
};

function isFilled(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function normalizeC1Category(v: string): string {
  const s = v.trim();
  if (!s) return s;
  if (s.toLowerCase() === 'your plant') return 'YOUR PLANT';
  if (s.toLowerCase() === 'ship to plant') return 'SHIP TO PLANT';
  if (s.toLowerCase() === 'user') return 'USER';
  return s.toUpperCase();
}

export function extractMasterFlatItemsFromWorksheet(db: FMEAWorksheetDB): FlatItemInput[] {
  const items: FlatItemInput[] = [];

  const l2ById = new Map<string, { no: string; name: string }>();
  db.l2Structures.forEach(l2 => {
    l2ById.set(l2.id, { no: l2.no, name: l2.name });
  });

  // L2 structures -> A1/A2
  db.l2Structures.forEach(l2 => {
    if (isFilled(l2.no)) items.push({ processNo: l2.no, category: 'A', itemCode: 'A1', value: l2.no, sourceFmeaId: db.fmeaId });
    if (isFilled(l2.name)) items.push({ processNo: l2.no, category: 'A', itemCode: 'A2', value: l2.name, sourceFmeaId: db.fmeaId });
  });

  // L2 functions -> A3/A4
  db.l2Functions.forEach(f => {
    const l2 = l2ById.get(f.l2StructId);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(f.functionName)) items.push({ processNo, category: 'A', itemCode: 'A3', value: f.functionName, sourceFmeaId: db.fmeaId });
    if (isFilled(f.productChar)) items.push({ processNo, category: 'A', itemCode: 'A4', value: f.productChar, sourceFmeaId: db.fmeaId });
  });

  // Failure modes -> A5
  db.failureModes.forEach(fm => {
    const l2 = l2ById.get(fm.l2StructId);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(fm.mode)) items.push({ processNo, category: 'A', itemCode: 'A5', value: fm.mode, sourceFmeaId: db.fmeaId });
  });

  // L3 structures -> B1
  db.l3Structures.forEach(l3 => {
    const l2 = l2ById.get(l3.l2Id);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(l3.name)) items.push({ processNo, category: 'B', itemCode: 'B1', value: l3.name, sourceFmeaId: db.fmeaId });
  });

  // L3 functions -> B2/B3
  db.l3Functions.forEach(f => {
    const l2 = l2ById.get(f.l2StructId);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(f.functionName)) items.push({ processNo, category: 'B', itemCode: 'B2', value: f.functionName, sourceFmeaId: db.fmeaId });
    if (isFilled(f.processChar)) items.push({ processNo, category: 'B', itemCode: 'B3', value: f.processChar, sourceFmeaId: db.fmeaId });
  });

  // Failure causes -> B4 (join through l3Function -> l2StructId)
  const l3FuncById = new Map<string, { l2StructId: string }>();
  db.l3Functions.forEach(f => l3FuncById.set(f.id, { l2StructId: f.l2StructId }));
  db.failureCauses.forEach(fc => {
    const l3f = l3FuncById.get(fc.l3FuncId);
    const l2 = l3f ? l2ById.get(l3f.l2StructId) : undefined;
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(fc.cause)) items.push({ processNo, category: 'B', itemCode: 'B4', value: fc.cause, sourceFmeaId: db.fmeaId });
  });

  // L1 functions -> C1/C2/C3 (project-wide)
  db.l1Functions.forEach(f => {
    const processNo = 'ALL';
    if (isFilled(f.category)) items.push({ processNo, category: 'C', itemCode: 'C1', value: normalizeC1Category(f.category), sourceFmeaId: db.fmeaId });
    if (isFilled(f.functionName)) items.push({ processNo, category: 'C', itemCode: 'C2', value: f.functionName, sourceFmeaId: db.fmeaId });
    if (isFilled(f.requirement)) items.push({ processNo, category: 'C', itemCode: 'C3', value: f.requirement, sourceFmeaId: db.fmeaId });
  });

  // Failure effects -> C4 (join to l1Function category)
  const l1FuncById = new Map<string, { category: string }>();
  db.l1Functions.forEach(f => l1FuncById.set(f.id, { category: f.category }));
  db.failureEffects.forEach(fe => {
    const processNo = 'ALL';
    if (isFilled(fe.effect)) items.push({ processNo, category: 'C', itemCode: 'C4', value: fe.effect, sourceFmeaId: db.fmeaId });
    const cat = l1FuncById.get(fe.l1FuncId)?.category;
    if (isFilled(cat)) items.push({ processNo, category: 'C', itemCode: 'C1', value: normalizeC1Category(cat), sourceFmeaId: db.fmeaId });
  });

  return items;
}

export async function upsertActiveMasterFromWorksheetTx(tx: any, db: FMEAWorksheetDB): Promise<void> {
  const items = extractMasterFlatItemsFromWorksheet(db);
  if (items.length === 0) return;

  // ✅ 방어 코드: 마스터 테이블이 DB에 없으면 (마이그레이션 전) 스킵
  if (!tx.pfmeaMasterDataset) {
    console.warn('[sync] PfmeaMasterDataset 테이블 없음 - 마스터 동기화 스킵 (prisma db push 필요)');
    return;
  }

  try {
    // ensure active dataset exists
    let ds = await tx.pfmeaMasterDataset.findFirst({ where: { isActive: true } });
    if (!ds) {
      ds = await tx.pfmeaMasterDataset.create({
        data: { name: 'AUTO-MASTER', isActive: true },
      });
    }

    await tx.pfmeaMasterFlatItem.createMany({
      data: items.map(i => ({
        datasetId: ds.id,
        processNo: i.processNo,
        category: i.category,
        itemCode: i.itemCode,
        value: i.value,
        sourceFmeaId: i.sourceFmeaId,
      })),
      skipDuplicates: true,
    });
  } catch (err: any) {
    // 테이블이 없는 경우 (마이그레이션 전) 에러 무시
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      console.warn('[sync] 마스터 테이블 없음 - 동기화 스킵:', err.message);
      return;
    }
    throw err; // 다른 에러는 그대로 throw
  }
}


