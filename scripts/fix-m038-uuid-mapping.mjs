// Fix pfm26-m038: set C3 parentItemId to correct C2 flat item UUID
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Confirmed from get-c2-uuids.mjs output:
// C2 UUIDs in actual DB runtime order
const C2_UUID_BY_VALUE_PREFIX = {
  'UBM·PR·Etch':     '2d5579a7-9a38-4a01-94db-4f46ed4fbe21', // YP-0 in runtime
  '고객 납품 기준':  '80d8e257-7fd7-40bd-99fb-315dedded315', // SP-0
  '고객 기능 안정성': 'c9359406-0f51-4932-b8e4-5b04f933e101', // SP-1
  '최종 사용자 전기적': '73271b88-b678-41ca-baf1-6112e465d7bf', // USER-0
  'RoHS 등 환경':    '8c8fdcaf-72e7-48f7-aef1-7e0aebd3af76', // USER-1
  'Au Bump 제품특성': '268a1f61-2a21-4ad8-a2fe-eb4c46856ec0', // YP-1 in runtime
  'Wafer 청정도':    'b4a3b9f6-4495-4d61-9656-45d54258ddd1', // YP-2 in runtime
};

// C3 value prefix → parent C2 value prefix (based on Excel L1 통합 sheet)
const C3_TO_C2_MAPPING = [
  // YP
  { c3: 'Au Bump 높이 규격',          c2: 'Au Bump 제품특성' },
  { c3: 'Au Bump 외관 결함 기준',      c2: 'Wafer 청정도' },
  { c3: '파티클 수 허용 기준',         c2: 'UBM·PR·Etch' },
  { c3: 'UBM 두께 규격',              c2: 'UBM·PR·Etch' },
  { c3: 'CD 규격',                    c2: 'UBM·PR·Etch' },
  { c3: 'PR 두께 규격',               c2: 'UBM·PR·Etch' },
  { c3: 'PR 잔사 허용 기준',          c2: 'UBM·PR·Etch' },
  { c3: 'Seed 잔류물 허용 기준',       c2: 'UBM·PR·Etch' },
  // SP
  { c3: 'Au Bump 높이 고객 출하 규격', c2: '고객 납품 기준' },
  { c3: 'Au Bump 외관 고객 기준',      c2: '고객 납품 기준' },
  { c3: '고객 납품 파티클 기준',       c2: '고객 납품 기준' },
  { c3: '포장 기준 적합성',           c2: '고객 납품 기준' },
  { c3: 'Au 순도 고객 규격',          c2: '고객 기능 안정성' },
  { c3: 'IMC 두께 고객 규격',         c2: '고객 기능 안정성' },
  // USER
  { c3: 'Au Bump 전기적 신뢰성 기준',  c2: '최종 사용자 전기적' },
  { c3: 'ESD 민감도 기준',            c2: 'RoHS 등 환경' },
  { c3: 'RoHS 유해물질 기준',         c2: 'RoHS 등 환경' },
];

async function main() {
  const target = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId: { contains: 'm038' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  });

  const c3Items = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId: target.id, itemCode: 'C3' },
    select: { id: true, value: true, parentItemId: true }
  });

  let fixed = 0, notFound = 0;
  for (const c3 of c3Items) {
    const mapping = C3_TO_C2_MAPPING.find(m => c3.value?.startsWith(m.c3));
    if (!mapping) {
      console.log(`  ⚠ No mapping: "${c3.value?.substring(0,50)}"`);
      notFound++;
      continue;
    }

    // Find C2 UUID
    const c2PrefixKey = Object.keys(C2_UUID_BY_VALUE_PREFIX).find(k => mapping.c2.startsWith(k));
    const c2Uuid = c2PrefixKey ? C2_UUID_BY_VALUE_PREFIX[c2PrefixKey] : null;
    if (!c2Uuid) {
      console.log(`  ⚠ No UUID for C2 prefix "${mapping.c2}"`);
      notFound++;
      continue;
    }

    if (c3.parentItemId === c2Uuid) {
      console.log(`  OK (already correct): "${c3.value?.substring(0,45)}"`);
      continue;
    }

    await prisma.pfmeaMasterFlatItem.update({ where: { id: c3.id }, data: { parentItemId: c2Uuid } });
    fixed++;
    console.log(`  Fixed: "${c3.value?.substring(0,45)}" → ${c2Uuid.substring(0,8)}... (${mapping.c2})`);
  }

  console.log(`\nFixed ${fixed} C3 items, ${notFound} unmapped`);
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); process.exit(1); });
