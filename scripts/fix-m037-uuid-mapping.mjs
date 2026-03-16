// Fix pfm26-m037: C3 parentItemId 교정
// 문제: C2 아이템이 구 key 포맷(C2-SP-1 등)과 UUID 포맷 혼재
//       C3들이 잘못된 C2를 가리키거나 parentItemId=NULL
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// 분석 결과 확정된 C2 UUID → 올바른 C3 value prefix 매핑
const FIXES = [
  // YP: Au Bump 제품특성 (UUID c2)
  { c3Id: 'c7fa2b70-23ea-4fed-a309-514b180dcb93', c2Id: '4c5a2b7d-e5be-4514-843b-8185ee4a20db', note: 'Au Bump 높이 규격 → Au Bump 제품특성' },
  // YP: Wafer 청정도 (UUID c2)
  { c3Id: 'a73ad3c7-0c0d-451a-a3cd-4ace175b13e0', c2Id: '5f70cf13-dabd-49a2-ac8e-8fb36a5b75fe', note: 'Au Bump 외관 결함 기준 → Wafer 청정도' },
  // SP: 고객 납품 기준 (UUID c2) — 납품 관련 4개 C3
  { c3Id: 'C3-SP-0', c2Id: '39dfea7b-424d-4361-b62e-77e2d476104e', note: 'Au Bump 높이 고객 출하 규격 → 고객 납품 기준' },
  { c3Id: 'C3-SP-1', c2Id: '39dfea7b-424d-4361-b62e-77e2d476104e', note: 'Au Bump 외관 고객 기준 → 고객 납품 기준' },
  { c3Id: 'C3-SP-2', c2Id: '39dfea7b-424d-4361-b62e-77e2d476104e', note: '고객 납품 파티클 기준 → 고객 납품 기준' },
  { c3Id: 'C3-SP-3', c2Id: '39dfea7b-424d-4361-b62e-77e2d476104e', note: '포장 기준 적합성 → 고객 납품 기준' },
  // USER: 최종 사용자 전기적 (UUID c2)
  { c3Id: 'C3-USER-0', c2Id: 'ee55f6d4-a6dc-47a6-a8c8-0fe40a5b84f6', note: 'Au Bump 전기적 신뢰성 기준 → 최종 사용자 전기적' },
];

async function main() {
  const dataset = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId: { contains: 'm037' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fmeaId: true }
  });
  console.log(`Dataset: ${dataset.fmeaId} (${dataset.id})`);

  // C2 존재 확인
  const c2Ids = [...new Set(FIXES.map(f => f.c2Id))];
  for (const id of c2Ids) {
    const exists = await prisma.pfmeaMasterFlatItem.findFirst({ where: { datasetId: dataset.id, id } });
    if (!exists) { console.error(`⚠ C2 not found: ${id}`); process.exit(1); }
    console.log(`  C2 OK: ${id.substring(0,8)} = "${exists.value?.substring(0,50)}"`);
  }

  let fixed = 0, skipped = 0;
  for (const fix of FIXES) {
    const c3 = await prisma.pfmeaMasterFlatItem.findFirst({
      where: { datasetId: dataset.id, id: fix.c3Id },
      select: { id: true, value: true, parentItemId: true }
    });
    if (!c3) { console.log(`  ⚠ C3 not found: ${fix.c3Id}`); skipped++; continue; }
    if (c3.parentItemId === fix.c2Id) {
      console.log(`  OK (already): "${c3.value?.substring(0,40)}"`);
      skipped++;
      continue;
    }
    await prisma.pfmeaMasterFlatItem.update({
      where: { id: fix.c3Id },
      data: { parentItemId: fix.c2Id }
    });
    fixed++;
    console.log(`  Fixed: "${c3.value?.substring(0,40)}" (${fix.note})`);
  }

  console.log(`\nFixed ${fixed}, skipped ${skipped}`);
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); process.exit(1); });
