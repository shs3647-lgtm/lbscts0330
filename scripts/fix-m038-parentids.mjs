// Script to fix pfm26-m038 dataset - set correct parentItemId for C3 items
// Prisma 7 requires Driver Adapter
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL not set');

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Confirmed C3 value → C2 value mapping from L1 통합(C1-C4) sheet analysis
// C2 values are prefix-matched
const C3_TO_C2_VALUE_MAP = [
  // YP group
  { c3Prefix: 'Au Bump 높이 규격',               c2Prefix: 'Au Bump 제품특성' },
  { c3Prefix: 'Au Bump 외관 결함 기준',           c2Prefix: 'Wafer 청정도' },
  { c3Prefix: '파티클 수 허용 기준',              c2Prefix: 'UBM·PR·Etch' },
  { c3Prefix: 'UBM 두께 규격',                   c2Prefix: 'UBM·PR·Etch' },
  { c3Prefix: 'CD 규격',                         c2Prefix: 'UBM·PR·Etch' },
  { c3Prefix: 'PR 두께 규격',                    c2Prefix: 'UBM·PR·Etch' },
  { c3Prefix: 'PR 잔사 허용 기준',               c2Prefix: 'UBM·PR·Etch' },
  { c3Prefix: 'Seed 잔류물 허용 기준',            c2Prefix: 'UBM·PR·Etch' },
  // SP group
  { c3Prefix: 'Au Bump 높이 고객 출하 규격',     c2Prefix: '고객 납품 기준' },
  { c3Prefix: 'Au Bump 외관 고객 기준',          c2Prefix: '고객 납품 기준' },
  { c3Prefix: '고객 납품 파티클 기준',            c2Prefix: '고객 납품 기준' },
  { c3Prefix: '포장 기준 적합성',                c2Prefix: '고객 납품 기준' },
  { c3Prefix: 'Au 순도 고객 규격',               c2Prefix: '고객 기능 안정성' },
  { c3Prefix: 'IMC 두께 고객 규격',              c2Prefix: '고객 기능 안정성' },
  // USER group
  { c3Prefix: 'Au Bump 전기적 신뢰성 기준',      c2Prefix: '최종 사용자 전기적' },
  { c3Prefix: 'ESD 민감도 기준',                 c2Prefix: 'RoHS 등 환경' },
  { c3Prefix: 'RoHS 유해물질 기준',              c2Prefix: 'RoHS 등 환경' },
];

// C2 value → C1 value mapping
const C2_TO_C1_VALUE_MAP = [
  { c2Prefix: 'Au Bump 제품특성', c1Value: 'YP' },
  { c2Prefix: 'Wafer 청정도',     c1Value: 'YP' },
  { c2Prefix: 'UBM·PR·Etch',     c1Value: 'YP' },
  { c2Prefix: '고객 납품 기준',   c1Value: 'SP' },
  { c2Prefix: '고객 기능 안정성', c1Value: 'SP' },
  { c2Prefix: '최종 사용자 전기적', c1Value: 'USER' },
  { c2Prefix: 'RoHS 등 환경',    c1Value: 'USER' },
];

function findByPrefix(items, prefix) {
  return items.find(i => i.value && i.value.startsWith(prefix));
}

async function main() {
  const target = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId: { contains: 'm038' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fmeaId: true }
  });
  if (!target) throw new Error('Dataset pfm26-m038 not found');
  console.log('Target:', target.fmeaId, '—', target.id);

  const allItems = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId: target.id, itemCode: { in: ['C1', 'C2', 'C3'] } },
    select: { id: true, itemCode: true, value: true, parentItemId: true }
  });

  const c1Items = allItems.filter(i => i.itemCode === 'C1');
  const c2Items = allItems.filter(i => i.itemCode === 'C2');
  const c3Items = allItems.filter(i => i.itemCode === 'C3');

  console.log(`Found: ${c1Items.length} C1, ${c2Items.length} C2, ${c3Items.length} C3`);

  // Fix C2 → C1
  const c1ByValue = Object.fromEntries(c1Items.map(i => [i.value?.trim(), i.id]));
  let c2Fixed = 0;
  for (const c2 of c2Items) {
    const mapping = C2_TO_C1_VALUE_MAP.find(m => c2.value?.startsWith(m.c2Prefix));
    if (!mapping) { console.log(`  No C1 mapping for C2: "${c2.value?.substring(0, 40)}"`); continue; }
    const c1Id = c1ByValue[mapping.c1Value];
    if (!c1Id) { console.log(`  C1 not found for value: ${mapping.c1Value}`); continue; }
    if (c2.parentItemId === c1Id) continue;
    await prisma.pfmeaMasterFlatItem.update({ where: { id: c2.id }, data: { parentItemId: c1Id } });
    c2Fixed++;
    console.log(`  C2 → C1[${mapping.c1Value}]: "${c2.value?.substring(0, 40)}"`);
  }
  console.log(`Fixed ${c2Fixed} C2→C1 links`);

  // Fix C3 → C2
  let c3Fixed = 0;
  let c3NotFound = 0;
  for (const c3 of c3Items) {
    const mapping = C3_TO_C2_VALUE_MAP.find(m => c3.value?.startsWith(m.c3Prefix));
    if (!mapping) {
      console.log(`  No C2 mapping for C3: "${c3.value?.substring(0, 50)}"`);
      c3NotFound++;
      continue;
    }
    const c2 = findByPrefix(c2Items, mapping.c2Prefix);
    if (!c2) { console.log(`  C2 not found with prefix: "${mapping.c2Prefix}"`); c3NotFound++; continue; }
    if (c3.parentItemId === c2.id) continue;
    await prisma.pfmeaMasterFlatItem.update({ where: { id: c3.id }, data: { parentItemId: c2.id } });
    c3Fixed++;
    console.log(`  C3 → C2: "${c3.value?.substring(0, 45)}" → "${c2.value?.substring(0, 35)}"`);
  }
  console.log(`Fixed ${c3Fixed} C3→C2 links, ${c3NotFound} not matched`);

  if (c3NotFound > 0) {
    console.log('\n⚠ Some C3 items were not matched. Trying fallback by position...');
    // Fallback: for unmatched C3s, use excelRow if available
    const unmatched = c3Items.filter(c3 => {
      const mapping = C3_TO_C2_VALUE_MAP.find(m => c3.value?.startsWith(m.c3Prefix));
      return !mapping;
    });
    for (const c3 of unmatched) {
      console.log(`  Unmatched: "${c3.value}"`);
    }
  }

  console.log('\nDataset ID for rebuild:', target.id);
}

main()
  .then(() => pool.end())
  .catch(e => { console.error('Error:', e.message); pool.end(); process.exit(1); });
