/**
 * 특별특성(specialChar) 3단계 진단 스크립트
 * 1. Import 자료: PfmeaMasterFlatItem에 specialChar 존재 여부
 * 2. 워크시트 state: legacyData의 productChars[].specialChar 존재 여부
 * 3. Atomic DB: L2Function.specialChar 존재 여부
 */
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public';
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== 특별특성(specialChar) 3단계 진단 ===\n');

  // 1단계: Import 자료 (PfmeaMasterFlatItem) 확인
  console.log('--- 1단계: Import 자료 (Master DB) ---');
  const a4Items = await prisma.pfmeaMasterFlatItem.findMany({
    where: { itemCode: 'A4' },
    select: { id: true, processNo: true, value: true, specialChar: true },
    take: 30,
  });
  const a4WithSC = a4Items.filter(i => i.specialChar && i.specialChar.trim());
  const a4WithoutSC = a4Items.filter(i => !i.specialChar || !i.specialChar.trim());
  console.log(`  A4(제품특성) 전체: ${a4Items.length}건`);
  console.log(`  specialChar 있음: ${a4WithSC.length}건`);
  console.log(`  specialChar 없음: ${a4WithoutSC.length}건`);
  if (a4WithSC.length > 0) {
    console.log('  샘플 (specialChar 있음):');
    a4WithSC.slice(0, 5).forEach(i => console.log(`    [${i.processNo}] "${i.value}" → SC: "${i.specialChar}"`));
  }
  if (a4WithoutSC.length > 0) {
    console.log('  샘플 (specialChar 없음):');
    a4WithoutSC.slice(0, 5).forEach(i => console.log(`    [${i.processNo}] "${i.value}" → SC: "${i.specialChar || '(null)'}"`));
  }

  const b3Items = await prisma.pfmeaMasterFlatItem.findMany({
    where: { itemCode: 'B3' },
    select: { id: true, processNo: true, value: true, specialChar: true },
    take: 30,
  });
  const b3WithSC = b3Items.filter(i => i.specialChar && i.specialChar.trim());
  console.log(`\n  B3(공정특성) 전체: ${b3Items.length}건, specialChar 있음: ${b3WithSC.length}건`);
  if (b3WithSC.length > 0) {
    b3WithSC.slice(0, 5).forEach(i => console.log(`    [${i.processNo}] "${i.value}" → SC: "${i.specialChar}"`));
  }

  // 2단계: 워크시트 legacyData 확인
  console.log('\n--- 2단계: 워크시트 legacyData ---');
  const legacyRecords = await prisma.fmeaLegacyData.findMany({ take: 3 });
  for (const rec of legacyRecords) {
    const data = rec.data;
    if (!data || !data.l2) continue;
    console.log(`\n  FMEA: ${rec.fmeaId}`);
    let totalPCs = 0, withSC = 0;
    for (const proc of data.l2) {
      for (const func of (proc.functions || [])) {
        for (const pc of (func.productChars || [])) {
          totalPCs++;
          if (pc.specialChar && String(pc.specialChar).trim() && pc.specialChar !== '-') {
            withSC++;
            if (withSC <= 3) console.log(`    [${proc.no}] func="${func.name}" pc="${pc.name}" → SC: "${pc.specialChar}"`);
          }
        }
      }
    }
    console.log(`    productChars 전체: ${totalPCs}건, specialChar 있음: ${withSC}건`);
  }

  // 3단계: atomic DB (L2Function.specialChar) 확인
  console.log('\n--- 3단계: Atomic DB (L2Function.specialChar) ---');
  const l2Funcs = await prisma.l2Function.findMany({
    where: { specialChar: { not: null } },
    select: { id: true, fmeaId: true, functionName: true, productChar: true, specialChar: true },
    take: 10,
  });
  const l2WithSC = l2Funcs.filter(f => f.specialChar && f.specialChar.trim());
  console.log(`  L2Function specialChar NOT NULL: ${l2Funcs.length}건`);
  console.log(`  L2Function specialChar 실제값: ${l2WithSC.length}건`);
  if (l2WithSC.length > 0) {
    l2WithSC.slice(0, 5).forEach(f => console.log(`    "${f.functionName}" / "${f.productChar}" → SC: "${f.specialChar}"`));
  }

  console.log('\n=== 진단 완료 ===');
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
