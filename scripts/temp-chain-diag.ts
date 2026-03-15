/**
 * 고장연결 누락 33건 진단 스크립트
 * Usage: npx tsx scripts/temp-chain-diag.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import * as dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL!;
console.log('DB URL:', dbUrl.replace(/:[^@]+@/, ':***@'));
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. 모든 PFMEA 프로젝트
  const projects = await prisma.fmeaProject.findMany({
    // where: { fmeaType: 'PFMEA' },
    select: { fmeaId: true, fmeaType: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });
  console.log('=== PFMEA Projects ===');
  for (const p of projects) console.log(`  ${p.fmeaId} | ${p.fmeaType}`);

  for (const proj of projects) {
    const fmeaId = proj.fmeaId;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== ${fmeaId}: ${proj.fmeaType} ===`);

    // 2. DB 엔티티 카운트
    const [linkCount, fmCount, feCount, fcCount] = await Promise.all([
      prisma.failureLink.count({ where: { fmeaId, deletedAt: null } }),
      prisma.failureMode.count({ where: { fmeaId } }),
      prisma.failureEffect.count({ where: { fmeaId } }),
      prisma.failureCause.count({ where: { fmeaId } }),
    ]);
    console.log(`  DB: FE=${feCount} FM=${fmCount} FC=${fcCount} Links=${linkCount}`);

    // 3. Link에서 실제 연결된 엔티티
    const links = await prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: null },
      select: { fmId: true, feId: true, fcId: true },
    });
    const linkedFmIds = new Set(links.map(l => l.fmId));
    const linkedFeIds = new Set(links.map(l => l.feId));
    const linkedFcIds = new Set(links.map(l => l.fcId));
    console.log(`  Linked: FE=${linkedFeIds.size} FM=${linkedFmIds.size} FC=${linkedFcIds.size}`);

    // 4. Missing
    const allFMs = await prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true } });
    const allFEs = await prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true } });
    const allFCs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true } });

    const missingFMs = allFMs.filter(fm => !linkedFmIds.has(fm.id));
    const missingFCs = allFCs.filter(fc => !linkedFcIds.has(fc.id));
    const missingFEs = allFEs.filter(fe => !linkedFeIds.has(fe.id));

    console.log(`  Missing: FMs=${missingFMs.length} FCs=${missingFCs.length} FEs=${missingFEs.length} Total=${missingFMs.length + missingFCs.length + missingFEs.length}`);

    if (missingFMs.length > 0) {
      console.log(`  Missing FM samples:`);
      missingFMs.slice(0, 5).forEach(fm => console.log(`    - ${fm.id.substring(0, 8)}... | ${(fm.mode || '').substring(0, 50)}`));
    }
    if (missingFCs.length > 0) {
      console.log(`  Missing FC samples:`);
      missingFCs.slice(0, 5).forEach(fc => console.log(`    - ${fc.id.substring(0, 8)}... | ${(fc.cause || '').substring(0, 50)}`));
    }
    if (missingFEs.length > 0) {
      console.log(`  Missing FE samples:`);
      missingFEs.slice(0, 5).forEach(fe => console.log(`    - ${fe.id.substring(0, 8)}... | ${(fe.effect || '').substring(0, 50)}`));
    }

    // 5. LegacyData failureLinks
    const legacy = await prisma.fmeaLegacyData.findFirst({
      where: { fmeaId },
      select: { data: true },
    });
    if (legacy?.data) {
      const d = legacy.data as any;
      const ll = d?.failureLinks || [];
      const withFe = ll.filter((l: any) => !!l.feId).length;
      const noFe = ll.length - withFe;
      console.log(`  Legacy links: total=${ll.length} withFeId=${withFe} noFeId=${noFe}`);

      // feId 분포
      const feIdDist = new Map<string, number>();
      for (const l of ll) {
        const k = l.feId || '(empty)';
        feIdDist.set(k, (feIdDist.get(k) || 0) + 1);
      }
      if (feIdDist.size > 0) {
        console.log(`  Legacy feId distinct: ${feIdDist.size}`);
        for (const [k, v] of [...feIdDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
          console.log(`    ${v}x: ${k.substring(0, 50)}`);
        }
      }
    }

    // 6. MasterDataset chains
    const ds = await prisma.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
      select: { failureChains: true },
    });
    if (ds?.failureChains) {
      const chains = ds.failureChains as any[];
      const hasFm = chains.filter(c => c.fmId).length;
      const hasFc = chains.filter(c => c.fcId).length;
      const hasFe = chains.filter(c => c.feId).length;
      const noFeVal = chains.filter(c => !c.feValue?.trim()).length;
      console.log(`  Chains: total=${chains.length} fmId=${hasFm} fcId=${hasFc} feId=${hasFe} noFeValue=${noFeVal}`);

      // feValue distinct
      const feVals = new Map<string, number>();
      for (const c of chains) {
        const k = (c.feValue || '').trim() || '(empty)';
        feVals.set(k, (feVals.get(k) || 0) + 1);
      }
      console.log(`  Chain feValue distinct: ${feVals.size}`);
      for (const [k, v] of [...feVals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
        console.log(`    ${v}x: ${k.substring(0, 70)}`);
      }
    }
  }

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
