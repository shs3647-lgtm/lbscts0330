/**
 * Import 갯수 검증 — @@map 테이블명 (snake_case) 사용
 */
import { getPrismaForSchema } from '../src/lib/prisma';

const fmeaId = 'pfm26-p020-l20';
const s = 'pfmea_pfm26_p020_l20'; // schema

async function main() {
  const p = getPrismaForSchema(s);
  if (!p) { console.error('❌ Prisma 초기화 실패'); return; }
  await p.$executeRawUnsafe(`SET search_path TO "${s}", public`);
  
  console.log(`\n═══ Import 갯수 검증 ═══  스키마: ${s}\n`);
  const q = async (sql: string) => (await p.$queryRawUnsafe(sql)) as any[];

  console.log('── 1. 엔티티별 카운트 ──');
  const tables: [string, string, number][] = [
    ['FE(고장영향)', `SELECT COUNT(*) as cnt FROM "${s}".failure_effects WHERE "fmeaId"='${fmeaId}'`, 20],
    ['FM(고장형태)', `SELECT COUNT(*) as cnt FROM "${s}".failure_modes WHERE "fmeaId"='${fmeaId}'`, 28],
    ['FC(고장원인)', `SELECT COUNT(*) as cnt FROM "${s}".failure_causes WHERE "fmeaId"='${fmeaId}'`, 115],
    ['FL(고장사슬)', `SELECT COUNT(*) as cnt FROM "${s}".failure_links WHERE "fmeaId"='${fmeaId}' AND "deletedAt" IS NULL`, 115],
    ['RA(위험분석)', `SELECT COUNT(*) as cnt FROM "${s}".risk_analyses WHERE "fmeaId"='${fmeaId}'`, 115],
    ['L2(공정)',     `SELECT COUNT(*) as cnt FROM "${s}".l2_structures WHERE "fmeaId"='${fmeaId}'`, 28],
    ['L3(작업요소)', `SELECT COUNT(*) as cnt FROM "${s}".l3_structures WHERE "fmeaId"='${fmeaId}'`, 115],
    ['L3Func',      `SELECT COUNT(*) as cnt FROM "${s}".l3_functions WHERE "fmeaId"='${fmeaId}'`, 115],
  ];
  for (const [label, sql, expected] of tables) {
    try {
      const rows = await q(sql);
      const cnt = Number(rows[0]?.cnt || 0);
      console.log(`  ${label.padEnd(14)} ${String(cnt).padStart(4)}건  (기대: ${expected}) ${cnt >= expected ? '✅' : '❌'}`);
    } catch (e: any) { console.log(`  ${label.padEnd(14)} ERR: ${e.message?.substring(0, 100)}`); }
  }

  // 복합키
  try {
    const rows = await q(`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT l2.no, fc.cause FROM "${s}".failure_causes fc LEFT JOIN "${s}".l2_structures l2 ON fc."l2StructId"=l2.id WHERE fc."fmeaId"='${fmeaId}') sub`);
    console.log(`  FC복합키고유   ${String(Number(rows[0]?.cnt||0)).padStart(4)}건  (~113)`);
  } catch(e: any) { console.log('  FC복합키 ERR:', e.message?.substring(0,100)); }

  console.log('\n── 2. FK 고아 ──');
  for (const [label, tbl, idCol, txtCol] of [
    ['FC', 'failure_causes', 'fcId', 'cause'],
    ['FM', 'failure_modes', 'fmId', 'mode'],
    ['FE', 'failure_effects', 'feId', 'effect'],
  ] as const) {
    try {
      const rows = await q(`SELECT t.id, t."${txtCol}" as txt FROM "${s}"."${tbl}" t LEFT JOIN "${s}".failure_links fl ON fl."${idCol}"=t.id AND fl."deletedAt" IS NULL WHERE t."fmeaId"='${fmeaId}' AND fl.id IS NULL`);
      console.log(`  ${label} 고아: ${rows.length}건 ${rows.length===0?'✅':'❌'}`);
      rows.slice(0,3).forEach((r:any) => console.log(`    → ${r.id}: "${(r.txt||'').substring(0,50)}"`));
    } catch(e:any) { console.log(`  ${label} ERR: ${e.message?.substring(0,100)}`); }
  }

  console.log('\n── 3. FL 깨진 FK ──');
  try {
    const rows = await q(`SELECT COUNT(*) FILTER (WHERE "fmId" IS NULL OR "fmId"='') as bfm, COUNT(*) FILTER (WHERE "feId" IS NULL OR "feId"='') as bfe, COUNT(*) FILTER (WHERE "fcId" IS NULL OR "fcId"='') as bfc FROM "${s}".failure_links WHERE "fmeaId"='${fmeaId}' AND "deletedAt" IS NULL`);
    const b = rows[0]||{};
    console.log(`  fmId빈: ${Number(b.bfm)}건 ${Number(b.bfm)===0?'✅':'❌'}`);
    console.log(`  feId빈: ${Number(b.bfe)}건 ${Number(b.bfe)===0?'✅':'❌'}`);
    console.log(`  fcId빈: ${Number(b.bfc)}건 ${Number(b.bfc)===0?'✅':'❌'}`);
  } catch(e:any) { console.log('  ERR:', e.message?.substring(0,100)); }

  console.log('\n═══ 검증 완료 ═══\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
