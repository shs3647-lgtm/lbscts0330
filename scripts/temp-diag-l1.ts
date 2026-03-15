/**
 * L1 types 구조 + migrateToAtomicDB 정밀 재현
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
  const legacy = await prisma.fmeaLegacyData.findFirst({
    where: { fmeaId },
    select: { data: true },
  });
  if (!legacy?.data) return;
  const d = legacy.data as any;

  // L1 types 상세
  const l1 = d.l1 || {};
  const types = l1.types || [];
  console.log(`l1.types: ${types.length}개`);
  types.forEach((t: any, i: number) => {
    const funcs = t.functions || [];
    console.log(`  type[${i}]: category="${t.category || t.name || ''}" functions=${funcs.length}`);
    funcs.forEach((f: any, j: number) => {
      const reqs = f.requirements || [];
      console.log(`    func[${j}]: name="${(f.name || '').substring(0, 50)}" reqs=${reqs.length}`);
      reqs.forEach((r: any, k: number) => {
        console.log(`      req[${k}]: id=${(r.id || '').substring(0, 30)} name="${(r.name || '').substring(0, 50)}" failureEffect="${(r.failureEffect || '').substring(0, 30)}"`);
      });
    });
  });

  // failureScopes 상세
  const scopes = l1.failureScopes || [];
  console.log(`\nfailureScopes: ${scopes.length}개`);
  scopes.slice(0, 3).forEach((s: any, i: number) => {
    console.log(`  [${i}]: id=${(s.id || '').substring(0, 30)} reqId=${(s.reqId || 'NONE').substring(0, 30)} effect="${(s.effect || s.name || '').substring(0, 50)}"`);
  });

  // 실제 Atomic DB 확인
  const [dbFE, dbFM, dbFC, dbLinks, dbL1Func] = await Promise.all([
    prisma.failureEffect.count({ where: { fmeaId } }),
    prisma.failureMode.count({ where: { fmeaId } }),
    prisma.failureCause.count({ where: { fmeaId } }),
    prisma.failureLink.count({ where: { fmeaId, deletedAt: null } }),
    prisma.l1Function.count({ where: { fmeaId } }),
  ]);
  console.log(`\n=== DB Atomic 상태 ===`);
  console.log(`L1Function: ${dbL1Func}`);
  console.log(`FE: ${dbFE}, FM: ${dbFM}, FC: ${dbFC}, Links: ${dbLinks}`);

  // DB FE의 l1FuncId 유효성
  if (dbFE > 0) {
    const fes = await prisma.failureEffect.findMany({
      where: { fmeaId },
      select: { id: true, l1FuncId: true, effect: true },
    });
    const l1Funcs = await prisma.l1Function.findMany({
      where: { fmeaId },
      select: { id: true },
    });
    const l1FuncIds = new Set(l1Funcs.map(f => f.id));
    const badFEs = fes.filter(fe => !l1FuncIds.has(fe.l1FuncId));
    console.log(`\nFE l1FuncId 검증: ${fes.length - badFEs.length}/${fes.length} 유효`);
    if (badFEs.length > 0) {
      console.log(`  ⚠️ 무효 FE:`);
      badFEs.slice(0, 5).forEach(fe => {
        console.log(`    id=${fe.id.substring(0, 20)} l1FuncId=${fe.l1FuncId.substring(0, 20)} effect="${(fe.effect || '').substring(0, 40)}"`);
      });
    }
  }

  // DB FM의 l2FuncId 유효성
  if (dbFM > 0) {
    const fms = await prisma.failureMode.findMany({
      where: { fmeaId },
      select: { id: true, l2FuncId: true, mode: true },
    });
    const l2Funcs = await prisma.l2Function.findMany({
      where: { fmeaId },
      select: { id: true },
    });
    const l2FuncIds = new Set(l2Funcs.map(f => f.id));
    const badFMs = fms.filter(fm => !l2FuncIds.has(fm.l2FuncId));
    console.log(`FM l2FuncId 검증: ${fms.length - badFMs.length}/${fms.length} 유효`);
    if (badFMs.length > 0) {
      console.log(`  ⚠️ 무효 FM ${badFMs.length}건`);
    }
  }

  // DB Links FK
  if (dbLinks > 0) {
    const links = await prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: null },
      select: { id: true, fmId: true, feId: true, fcId: true },
    });
    const fmIds = new Set((await prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } })).map(m => m.id));
    const feIds = new Set((await prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } })).map(e => e.id));
    const fcIds = new Set((await prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } })).map(c => c.id));

    const badLinks = links.filter(l => !fmIds.has(l.fmId) || !feIds.has(l.feId) || !fcIds.has(l.fcId));
    console.log(`Link FK 검증: ${links.length - badLinks.length}/${links.length} 유효`);
    if (badLinks.length > 0) {
      console.log(`  ⚠️ 무효 Link ${badLinks.length}건`);
    }
  }

  // FailureAnalysis, RiskAnalysis 현황
  const [dbFA, dbRA] = await Promise.all([
    prisma.failureAnalysis.count({ where: { fmeaId } }),
    prisma.riskAnalysis.count({ where: { fmeaId } }),
  ]);
  console.log(`\nFailureAnalysis: ${dbFA}`);
  console.log(`RiskAnalysis: ${dbRA}`);

  // FailureAnalysis linkId 유효성
  if (dbFA > 0) {
    const fas = await prisma.failureAnalysis.findMany({
      where: { fmeaId },
      select: { id: true, linkId: true },
    });
    const linkIds = new Set((await prisma.failureLink.findMany({ where: { fmeaId, deletedAt: null }, select: { id: true } })).map(l => l.id));
    const badFAs = fas.filter(fa => !linkIds.has(fa.linkId));
    console.log(`FA linkId 검증: ${fas.length - badFAs.length}/${fas.length} 유효 (무효: ${badFAs.length})`);
  }

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
