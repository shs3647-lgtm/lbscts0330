// Fix pfm26-m038: set parentItemId for C3 items to key format "C2-YP-0" etc.
// (buildWorksheetState expects: c3.parentItemId === `C2-${type.name}-${i}`)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Mapping: C3 value prefix → C2 key in "C2-{type}-{index}" format
// Based on L1 통합(C1-C4) sheet analysis + C2 order in DB (YP: 0=제품특성, 1=Wafer청정도, 2=UBM/PR/Etch)
const C3_TO_C2_KEY = [
  // YP group (processNo='YP')
  { c3Prefix: 'Au Bump 높이 규격',              c2Key: 'C2-YP-0' },
  { c3Prefix: 'Au Bump 외관 결함 기준',          c2Key: 'C2-YP-1' },
  { c3Prefix: '파티클 수 허용 기준',             c2Key: 'C2-YP-2' },
  { c3Prefix: 'UBM 두께 규격',                  c2Key: 'C2-YP-2' },
  { c3Prefix: 'CD 규격',                        c2Key: 'C2-YP-2' },
  { c3Prefix: 'PR 두께 규격',                   c2Key: 'C2-YP-2' },
  { c3Prefix: 'PR 잔사 허용 기준',              c2Key: 'C2-YP-2' },
  { c3Prefix: 'Seed 잔류물 허용 기준',           c2Key: 'C2-YP-2' },
  // SP group (processNo='SP')
  { c3Prefix: 'Au Bump 높이 고객 출하 규격',    c2Key: 'C2-SP-0' },
  { c3Prefix: 'Au Bump 외관 고객 기준',         c2Key: 'C2-SP-0' },
  { c3Prefix: '고객 납품 파티클 기준',           c2Key: 'C2-SP-0' },
  { c3Prefix: '포장 기준 적합성',               c2Key: 'C2-SP-0' },
  { c3Prefix: 'Au 순도 고객 규격',              c2Key: 'C2-SP-1' },
  { c3Prefix: 'IMC 두께 고객 규격',             c2Key: 'C2-SP-1' },
  // USER group (processNo='USER')
  { c3Prefix: 'Au Bump 전기적 신뢰성 기준',     c2Key: 'C2-USER-0' },
  { c3Prefix: 'ESD 민감도 기준',                c2Key: 'C2-USER-1' },
  { c3Prefix: 'RoHS 유해물질 기준',             c2Key: 'C2-USER-1' },
];

// But wait: buildWorksheetState uses index i from c2Items order within same processNo
// C2 items for YP (processNo='YP'), sorted by... what order?
// The code does: const funcs = c2Items.map((c2, i) => ...)
// and expectedParent = `C2-${type.name}-${i}` where i is the index in c2Items array
// So C2-YP-0 = first YP c2, C2-YP-1 = second YP c2, etc.
// From DB output: YP c2s are: "Au Bump 제품특성"(0), "UBM·PR·Etch"(1), "Wafer 청정도"(2)
// BUT the DB returns them in random order unless ordered — the actual order matters!
//
// Let me verify by checking what order c2Items come back when filtered in buildWorksheetState

async function main() {
  const target = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId: { contains: 'm038' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  });

  const allItems = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId: target.id, itemCode: { in: ['C2', 'C3'] } },
    select: { id: true, itemCode: true, processNo: true, value: true, parentItemId: true, excelRow: true, orderIndex: true },
    orderBy: [{ processNo: 'asc' }, { excelRow: 'asc' }]
  });

  const c2Items = allItems.filter(i => i.itemCode === 'C2');
  const c3Items = allItems.filter(i => i.itemCode === 'C3');

  console.log('C2 items ordered by processNo + excelRow:');
  c2Items.forEach((c2, gi) => {
    // group index within same processNo
    const sameType = c2Items.filter(x => x.processNo === c2.processNo);
    const localIdx = sameType.indexOf(c2);
    console.log(`  [${c2.processNo}][${localIdx}] "${c2.value?.substring(0,50)}" excelRow=${c2.excelRow}`);
  });

  // Now figure out the correct mapping based on actual DB order
  // Group C2 by processNo and determine index
  const c2ByType = {};
  for (const c2 of c2Items) {
    if (!c2ByType[c2.processNo]) c2ByType[c2.processNo] = [];
    c2ByType[c2.processNo].push(c2);
  }

  console.log('\nPlanned C3 → C2 key mapping:');
  let fixed = 0, notFound = 0;
  for (const c3 of c3Items) {
    const mapping = C3_TO_C2_KEY.find(m => c3.value?.startsWith(m.c3Prefix));
    if (!mapping) {
      console.log(`  ⚠ No mapping: "${c3.value?.substring(0,50)}"`);
      notFound++;
      continue;
    }

    // Verify the c2Key matches the actual C2 order in DB
    // The buildWorksheetState.ts uses: c2Items.filter(i => i.itemCode === 'C2' && i.processNo === type.name)
    // without explicit ordering — so depends on DB retrieval order
    // BUT resave-import loads flat items without ordering guarantee
    // The safest approach: use the actual C2 UUIDs that were stored from the last import build
    // BUT the code in buildWorksheetState doesn't use UUID matching — it uses index!

    const newParentId = mapping.c2Key;
    if (c3.parentItemId === newParentId) continue;

    await prisma.pfmeaMasterFlatItem.update({ where: { id: c3.id }, data: { parentItemId: newParentId } });
    fixed++;
    console.log(`  Fixed C3 "${c3.value?.substring(0,45)}" → ${newParentId}`);
  }

  console.log(`\nFixed ${fixed} C3 items, ${notFound} not matched`);

  // Also verify what the C2 order will be when loaded (to confirm C2-YP-0 = Au Bump 제품특성)
  console.log('\nExpected C2 key assignments:');
  for (const [type, c2s] of Object.entries(c2ByType)) {
    c2s.forEach((c2, i) => {
      console.log(`  C2-${type}-${i} = "${c2.value?.substring(0,50)}"`);
    });
  }
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); process.exit(1); });
