/**
 * 연쇄 삭제 원인 진단: failureAnalyses/riskAnalyses의 linkId ↔ failureLinks id 매칭
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
  console.log(`=== ${fmeaId} 연쇄 삭제 원인 진단 ===\n`);

  const legacy = await prisma.fmeaLegacyData.findFirst({
    where: { fmeaId },
    select: { data: true },
  });
  if (!legacy?.data) { console.log('No legacy data'); return; }
  const d = legacy.data as any;

  const links = d?.failureLinks || [];
  const analyses = d?.failureAnalyses || [];
  const risks = d?.riskAnalyses || [];
  const opts = d?.optimizations || [];

  console.log(`failureLinks: ${links.length}`);
  console.log(`failureAnalyses: ${analyses.length}`);
  console.log(`riskAnalyses: ${risks.length}`);
  console.log(`optimizations: ${opts.length}`);

  const linkIdSet = new Set(links.map((l: any) => l.id));

  // failureAnalyses linkId 매칭
  const matchedAnalyses = analyses.filter((fa: any) => linkIdSet.has(fa.linkId));
  const unmatchedAnalyses = analyses.filter((fa: any) => !linkIdSet.has(fa.linkId));
  console.log(`\nfailureAnalyses linkId 매칭: ${matchedAnalyses.length}/${analyses.length}`);
  if (unmatchedAnalyses.length > 0) {
    console.log(`  미매칭 ${unmatchedAnalyses.length}건 샘플:`);
    unmatchedAnalyses.slice(0, 5).forEach((fa: any) => {
      console.log(`    linkId=${(fa.linkId || '').substring(0, 30)} fmText="${(fa.fmText || '').substring(0, 40)}"`);
    });

    // 미매칭 linkId가 어디서 왔는지 확인
    const unmatchedLinkIds = new Set(unmatchedAnalyses.map((fa: any) => fa.linkId));
    console.log(`  미매칭 linkId 고유 수: ${unmatchedLinkIds.size}`);
  }

  // riskAnalyses linkId 매칭
  const matchedRisks = risks.filter((r: any) => linkIdSet.has(r.linkId));
  const unmatchedRisks = risks.filter((r: any) => !linkIdSet.has(r.linkId));
  console.log(`\nriskAnalyses linkId 매칭: ${matchedRisks.length}/${risks.length}`);
  if (unmatchedRisks.length > 0) {
    console.log(`  미매칭 ${unmatchedRisks.length}건`);
  }

  // DB 테이블 확인
  const [dbLinks, dbAnalyses, dbRisks] = await Promise.all([
    prisma.failureLink.count({ where: { fmeaId, deletedAt: null } }),
    prisma.failureAnalysis.count({ where: { fmeaId } }),
    prisma.riskAnalysis.count({ where: { fmeaId } }),
  ]);
  console.log(`\nDB 테이블: Links=${dbLinks} Analyses=${dbAnalyses} Risks=${dbRisks}`);

  // FK sets (route.ts와 동일 로직)
  // fmIdSet, feIdSet, fcIdSet
  const failureScopes = d?.l1?.failureScopes || [];
  const feIdSet = new Set(failureScopes.map((f: any) => f.id));
  const fmIdSet = new Set<string>();
  const fcIdSet = new Set<string>();
  for (const proc of (d?.l2 || [])) {
    for (const fm of (proc.failureModes || [])) fmIdSet.add(fm.id);
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) fcIdSet.add(fc.id);
    }
    for (const fc of (proc.failureCauses || [])) fcIdSet.add(fc.id);
  }
  console.log(`\nFK Sets: fmIdSet=${fmIdSet.size} feIdSet=${feIdSet.size} fcIdSet=${fcIdSet.size}`);

  // filterValidLinks 시뮬레이션
  const validLinks = links.filter((l: any) =>
    !!l.fmId && !!l.fcId &&
    fmIdSet.has(l.fmId) && fcIdSet.has(l.fcId) &&
    (!l.feId || feIdSet.has(l.feId))
  );
  const dbSavableLinks = validLinks.filter((l: any) => !!l.feId);
  console.log(`filterValidLinks: valid=${validLinks.length} dbSavable=${dbSavableLinks.length} dropped=${links.length - validLinks.length}`);

  // FK 실패 원인 분석
  const fkFails = links.filter((l: any) => !validLinks.includes(l));
  if (fkFails.length > 0) {
    console.log(`\nFK 실패 원인:`);
    for (const l of fkFails.slice(0, 10)) {
      const reasons: string[] = [];
      if (!l.fmId) reasons.push('fmId없음');
      else if (!fmIdSet.has(l.fmId)) reasons.push(`fmId미존재(${(l.fmId||'').substring(0,15)})`);
      if (!l.fcId) reasons.push('fcId없음');
      else if (!fcIdSet.has(l.fcId)) reasons.push(`fcId미존재(${(l.fcId||'').substring(0,15)})`);
      if (l.feId && !feIdSet.has(l.feId)) reasons.push(`feId미존재(${(l.feId||'').substring(0,15)})`);
      console.log(`  ${reasons.join(', ')} | fm="${(l.fmText||'').substring(0,30)}" fc="${(l.fcText||'').substring(0,30)}"`);
    }
  }

  // savedLinkIds → FailureAnalysis 매칭 시뮬레이션
  const savedLinkIdSet = new Set(dbSavableLinks.map((l: any) => l.id));
  const validAnalyses2 = analyses.filter((fa: any) => savedLinkIdSet.has(fa.linkId));
  console.log(`\n=== 최종 시뮬레이션 ===`);
  console.log(`savedLinkIds: ${savedLinkIdSet.size}`);
  console.log(`FailureAnalysis 통과: ${validAnalyses2.length}/${analyses.length} (드롭: ${analyses.length - validAnalyses2.length})`);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
