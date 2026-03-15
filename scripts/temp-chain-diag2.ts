/**
 * 고장연결 누락 진단 2: legacyData 내부 분석
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const fmeaId = 'pfm26-m016';
  console.log(`=== ${fmeaId} legacyData 내부 분석 ===\n`);

  const legacy = await prisma.fmeaLegacyData.findFirst({
    where: { fmeaId },
    select: { data: true },
  });
  if (!legacy?.data) { console.log('No legacy data'); return; }

  const d = legacy.data as any;

  // 1. L1 (failureScopes = FE)
  const failureScopes = d?.l1?.failureScopes || [];
  console.log(`L1 failureScopes (FE): ${failureScopes.length}`);
  for (const fe of failureScopes) {
    console.log(`  id=${(fe.id || '').substring(0, 20)}... effect="${(fe.effect || fe.name || '').substring(0, 60)}"`);
  }

  // 2. L2 (FM, FC, WE)
  const l2 = d?.l2 || [];
  let totalFM = 0, totalFC = 0, totalWE = 0;
  const fmIds: string[] = [];
  const fcIds: string[] = [];
  for (const proc of l2) {
    const fms = proc.failureModes || [];
    totalFM += fms.length;
    fmIds.push(...fms.map((fm: any) => fm.id));

    for (const we of (proc.l3 || [])) {
      totalWE++;
      const fcs = we.failureCauses || [];
      totalFC += fcs.length;
      fcIds.push(...fcs.map((fc: any) => fc.id));
    }
    const procFcs = proc.failureCauses || [];
    totalFC += procFcs.length;
    fcIds.push(...procFcs.map((fc: any) => fc.id));
  }
  console.log(`\nL2 processes: ${l2.length}`);
  console.log(`Total FM: ${totalFM}`);
  console.log(`Total FC: ${totalFC}`);
  console.log(`Total WE: ${totalWE}`);

  // 3. failureLinks 분석
  const links = d?.failureLinks || [];
  console.log(`\nfailureLinks: ${links.length}`);

  const linkedFmIds = new Set<string>();
  const linkedFeIds = new Set<string>();
  const linkedFcIds = new Set<string>();
  const fmLinkCounts = new Map<string, { feCount: number; fcCount: number }>();

  for (const l of links) {
    if (l.fmId) linkedFmIds.add(l.fmId);
    if (l.feId) linkedFeIds.add(l.feId);
    if (l.fcId) linkedFcIds.add(l.fcId);

    if (l.fmId) {
      const c = fmLinkCounts.get(l.fmId) || { feCount: 0, fcCount: 0 };
      if (l.feId) c.feCount++;
      if (l.fcId) c.fcCount++;
      fmLinkCounts.set(l.fmId, c);
    }
  }

  console.log(`Linked unique: FE=${linkedFeIds.size} FM=${linkedFmIds.size} FC=${linkedFcIds.size}`);

  // 4. Missing 계산 (FailureLinkTab.tsx와 동일 로직)
  // missingFMs: FC 연결 없는 FM
  const missingFMs = fmIds.filter(id => {
    const c = fmLinkCounts.get(id);
    return !c || c.fcCount === 0;
  });
  // missingFCs: 링크에 없는 FC
  const missingFCs = fcIds.filter(id => !linkedFcIds.has(id));
  // missingFEs: 링크에 없는 FE
  const missingFEs = failureScopes.filter((fe: any) => !linkedFeIds.has(fe.id));

  console.log(`\n=== Missing 분석 ===`);
  console.log(`missingFMs: ${missingFMs.length} (FC 미연결 FM)`);
  console.log(`missingFCs: ${missingFCs.length} (링크 미참조 FC)`);
  console.log(`missingFEs: ${missingFEs.length} (링크 미참조 FE)`);
  console.log(`TOTAL missing: ${missingFMs.length + missingFCs.length + missingFEs.length}`);

  // 5. Missing FM 상세
  if (missingFMs.length > 0) {
    console.log(`\nMissing FM 상세:`);
    for (const fmId of missingFMs) {
      let fmName = '';
      let procNo = '';
      for (const proc of l2) {
        const fm = (proc.failureModes || []).find((f: any) => f.id === fmId);
        if (fm) { fmName = fm.name || ''; procNo = proc.no || ''; break; }
      }
      console.log(`  공정${procNo} | ${fmId.substring(0, 15)}... | "${fmName.substring(0, 50)}"`);
    }
  }

  // 6. Missing FC 상세 (일부만)
  if (missingFCs.length > 0) {
    console.log(`\nMissing FC 상세 (처음 10건):`);
    let shown = 0;
    for (const fcId of missingFCs) {
      if (shown >= 10) break;
      let fcName = '', procNo = '', m4 = '';
      for (const proc of l2) {
        for (const we of (proc.l3 || [])) {
          const fc = (we.failureCauses || []).find((f: any) => f.id === fcId);
          if (fc) { fcName = fc.name || ''; procNo = proc.no || ''; m4 = we.m4 || ''; break; }
        }
        if (fcName) break;
        const pfc = (proc.failureCauses || []).find((f: any) => f.id === fcId);
        if (pfc) { fcName = pfc.name || ''; procNo = proc.no || ''; break; }
      }
      console.log(`  공정${procNo} | ${m4} | ${fcId.substring(0, 15)}... | "${fcName.substring(0, 50)}"`);
      shown++;
    }
  }

  // 7. Missing FE 상세
  if (missingFEs.length > 0) {
    console.log(`\nMissing FE 상세:`);
    for (const fe of missingFEs) {
      console.log(`  ${(fe.id || '').substring(0, 15)}... | "${(fe.effect || fe.name || '').substring(0, 60)}"`);
    }
  }

  // 8. 링크에서 fmId/fcId가 실제 엔티티에 없는 경우 (고아 링크)
  const fmIdSet = new Set(fmIds);
  const fcIdSet = new Set(fcIds);
  const feIdSet = new Set(failureScopes.map((f: any) => f.id));
  const orphanFm = links.filter((l: any) => l.fmId && !fmIdSet.has(l.fmId));
  const orphanFc = links.filter((l: any) => l.fcId && !fcIdSet.has(l.fcId));
  const orphanFe = links.filter((l: any) => l.feId && !feIdSet.has(l.feId));
  console.log(`\n=== 고아 링크 (엔티티 미존재) ===`);
  console.log(`orphanFm: ${orphanFm.length} (fmId가 FM에 없음)`);
  console.log(`orphanFc: ${orphanFc.length} (fcId가 FC에 없음)`);
  console.log(`orphanFe: ${orphanFe.length} (feId가 FE에 없음)`);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
