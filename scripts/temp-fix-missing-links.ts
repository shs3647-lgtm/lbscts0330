/**
 * 잔여 누락 FM 3건 + FC 6건 진단 — chain과 엔티티 매칭 실패 원인 분석
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeText(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function main() {
  const fmeaId = 'pfm26-m016';
  console.log(`=== ${fmeaId} 잔여 누락 분석 ===\n`);

  const legacy = await prisma.fmeaLegacyData.findFirst({
    where: { fmeaId },
    select: { data: true },
  });
  if (!legacy?.data) { console.log('No legacy data'); return; }

  const d = legacy.data as any;
  const links = d?.failureLinks || [];
  const linkedFmIds = new Set(links.map((l: any) => l.fmId));
  const linkedFcIds = new Set(links.map((l: any) => l.fcId));

  // chains
  const ds = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId, isActive: true },
    select: { failureChains: true },
  });
  const chains = (ds?.failureChains as any[]) || [];

  // Missing FM 분석
  console.log('=== Missing FM ===');
  for (const proc of (d?.l2 || [])) {
    for (const fm of (proc.failureModes || [])) {
      if (linkedFmIds.has(fm.id)) continue;
      console.log(`\nMissing FM: 공정${proc.no} | "${fm.name}"`);
      console.log(`  FM id: ${fm.id}`);

      // chain에서 이 FM 텍스트와 매칭되는 chain 찾기
      const nfm = normalizeText(fm.name);
      const matchingChains = chains.filter((c: any) =>
        normalizeText(c.fmValue) === nfm ||
        normalizeText(c.fmValue).includes(nfm) ||
        nfm.includes(normalizeText(c.fmValue))
      );
      if (matchingChains.length > 0) {
        console.log(`  매칭 chain: ${matchingChains.length}건`);
        matchingChains.slice(0, 3).forEach((c: any) => {
          console.log(`    processNo=${c.processNo} fmValue="${(c.fmValue || '').substring(0, 60)}" fcValue="${(c.fcValue || '').substring(0, 40)}"`);
        });
      } else {
        console.log(`  ⚠️ 매칭 chain 없음!`);
        // 유사 chain 검색
        const partialMatches = chains.filter((c: any) => {
          const cfm = normalizeText(c.fmValue);
          return cfm && proc.no && normalizeText(c.processNo) === normalizeText(proc.no);
        });
        if (partialMatches.length > 0) {
          console.log(`  같은 공정(${proc.no}) chain ${partialMatches.length}건:`);
          partialMatches.slice(0, 5).forEach((c: any) => {
            console.log(`    fmValue="${(c.fmValue || '').substring(0, 60)}"`);
          });
        }
      }
    }
  }

  // Missing FC 분석
  console.log('\n=== Missing FC ===');
  for (const proc of (d?.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        if (linkedFcIds.has(fc.id)) continue;
        console.log(`\nMissing FC: 공정${proc.no} | WE=${we.m4 || we.name || '?'} | "${fc.name}"`);
        console.log(`  FC id: ${fc.id}`);

        const nfc = normalizeText(fc.name);
        const matchingChains = chains.filter((c: any) =>
          normalizeText(c.fcValue) === nfc
        );
        if (matchingChains.length > 0) {
          console.log(`  매칭 chain: ${matchingChains.length}건`);
          matchingChains.slice(0, 2).forEach((c: any) => {
            console.log(`    processNo=${c.processNo} fmValue="${(c.fmValue || '').substring(0, 40)}" m4="${c.m4 || ''}"`);
          });
        } else {
          console.log(`  ⚠️ 매칭 chain 없음!`);
        }
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      if (linkedFcIds.has(fc.id)) continue;
      console.log(`\nMissing FC (proc-level): 공정${proc.no} | "${fc.name}"`);
    }
  }

  // 전체 chain 중 link 미생성 chain 확인
  console.log('\n=== Chain → Link 매칭 실패 분석 ===');
  // chains는 UUID 미할당이므로 텍스트로 비교
  const linkedFmTexts = new Set(links.map((l: any) => normalizeText(l.fmText)));
  const linkedFcTexts = new Set(links.map((l: any) => normalizeText(l.fcText)));

  let unmatchedChains = 0;
  for (const c of chains) {
    const fmMatch = linkedFmTexts.has(normalizeText(c.fmValue));
    const fcMatch = linkedFcTexts.has(normalizeText(c.fcValue));
    if (!fmMatch || !fcMatch) {
      if (unmatchedChains < 10) {
        console.log(`  UNMATCHED: pNo=${c.processNo} fm=${fmMatch?'✓':'✗'}"${(c.fmValue||'').substring(0,35)}" fc=${fcMatch?'✓':'✗'}"${(c.fcValue||'').substring(0,35)}"`);
      }
      unmatchedChains++;
    }
  }
  console.log(`\n총 미매칭 chain: ${unmatchedChains}/${chains.length}`);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
