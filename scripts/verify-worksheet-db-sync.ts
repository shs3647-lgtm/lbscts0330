/**
 * @file verify-worksheet-db-sync.ts
 * Prisma: model=PascalCase → @@map("snake_case"), field=camelCase → DB도 camelCase (따옴표 필요)
 *
 * 사용법: npx tsx scripts/verify-worksheet-db-sync.ts [fmeaId]
 */
import pg from 'pg';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db?schema=public';

async function cnt(pool: pg.Pool, table: string, fid: string, extra?: string): Promise<number> {
  try {
    const w = extra ? `AND ${extra}` : '';
    const r = await pool.query(`SELECT count(*) FROM ${table} WHERE "fmeaId" = $1 ${w}`, [fid]);
    return parseInt(r.rows[0].count);
  } catch (e: any) {
    console.warn(`  ⚠️ ${table}: ${e.message?.slice(0, 60)}`);
    return -1;
  }
}

async function verifyProject(fmeaId: string) {
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const connStr = DATABASE_URL.replace(/\?.*/, '');
  const pool = new pg.Pool({ connectionString: connStr });

  // 스키마 확인
  const ck = await pool.query(`SELECT 1 FROM information_schema.schemata WHERE schema_name=$1`, [schemaName]);
  if (ck.rows.length === 0) { console.error(`❌ 스키마 없음: ${schemaName}`); await pool.end(); return; }

  await pool.query(`SET search_path TO "${schemaName}", public`);
  const fid = fmeaId.toLowerCase();

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  FMEA DB 동기화 검증 | ${fmeaId} | ${schemaName}`);
  console.log(`  ${new Date().toLocaleString('ko-KR')}`);
  console.log(`${'═'.repeat(80)}`);

  // ─── 엔티티 카운트 ───
  type R = { code: string; name: string; level: string; db: number; parent: string };
  const rs: R[] = [];

  // L1
  const c1r = await pool.query(`SELECT DISTINCT "category" FROM l1_functions WHERE "fmeaId"=$1 AND "category"!=''`, [fid]);
  rs.push({ code: 'C1', name: '구분', level: 'L1', db: c1r.rows.length, parent: '—' });
  rs.push({ code: 'C2', name: '제품기능', level: 'L1', db: await cnt(pool, 'l1_functions', fid), parent: 'C1' });
  rs.push({ code: 'C3', name: '요구사항', level: 'L1', db: await cnt(pool, 'l1_functions', fid, `"requirement" IS NOT NULL AND "requirement"!=''`), parent: 'C2' });
  rs.push({ code: 'C4', name: '★고장영향(FE)', level: 'L1', db: await cnt(pool, 'failure_effects', fid), parent: 'C3' });

  // L2
  const a1v = await cnt(pool, 'l2_structures', fid);
  rs.push({ code: 'A1', name: '공정번호', level: 'L2', db: a1v, parent: '—' });
  rs.push({ code: 'A2', name: '공정명', level: 'L2', db: a1v, parent: 'A1' });
  rs.push({ code: 'A3', name: '공정기능', level: 'L2', db: await cnt(pool, 'l2_functions', fid), parent: 'A1' });
  rs.push({ code: 'A4', name: '제품특성', level: 'L2', db: await cnt(pool, 'process_product_chars', fid), parent: 'A1' });
  const a5v = await cnt(pool, 'failure_modes', fid);
  rs.push({ code: 'A5', name: '★고장형태(FM)', level: 'L2', db: a5v, parent: 'A4' });
  rs.push({ code: 'A6', name: '검출관리', level: 'L2', db: await cnt(pool, 'risk_analyses', fid, `"detectionControl" IS NOT NULL AND "detectionControl"!=''`), parent: 'A5' });

  // L3
  const b1v = await cnt(pool, 'l3_structures', fid);
  rs.push({ code: 'B1', name: '작업요소', level: 'L3', db: b1v, parent: 'A1' });
  rs.push({ code: 'B2', name: '요소기능', level: 'L3', db: await cnt(pool, 'l3_functions', fid), parent: 'B1' });
  rs.push({ code: 'B3', name: '공정특성', level: 'L3', db: await cnt(pool, 'l3_functions', fid, `"processChar" IS NOT NULL AND "processChar"!=''`), parent: 'B2' });
  const b4v = await cnt(pool, 'failure_causes', fid);
  rs.push({ code: 'B4', name: '★고장원인(FC)', level: 'L3', db: b4v, parent: 'B3' });
  rs.push({ code: 'B5', name: '예방관리', level: 'L3', db: await cnt(pool, 'risk_analyses', fid, `"preventionControl" IS NOT NULL AND "preventionControl"!=''`), parent: 'B4' });

  // FC (FailureLink 기반)
  let flCount = 0;
  try { const fl = await pool.query(`SELECT count(*) FROM failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`, [fid]); flCount = parseInt(fl.rows[0].count); } catch {}
  let d1 = 0, d2 = 0, d3 = 0;
  try {
    d1 = parseInt((await pool.query(`SELECT count(DISTINCT "feId") FROM failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL AND "feId" IS NOT NULL AND "feId"!=''`, [fid])).rows[0].count);
    d2 = parseInt((await pool.query(`SELECT count(DISTINCT "fmProcess") FROM failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL AND "fmProcess" IS NOT NULL AND "fmProcess"!=''`, [fid])).rows[0].count);
    d3 = parseInt((await pool.query(`SELECT count(DISTINCT "fmId") FROM failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`, [fid])).rows[0].count);
  } catch {}
  rs.push({ code: 'D1', name: '★고장영향(FE)', level: 'FC', db: d1, parent: '—' });
  rs.push({ code: 'D2', name: '공정명', level: 'FC', db: d2, parent: '—' });
  rs.push({ code: 'D3', name: '★고장형태(FM)', level: 'FC', db: d3, parent: '—' });
  rs.push({ code: 'D4', name: '작업요소', level: 'FC', db: b1v, parent: '—' });
  rs.push({ code: 'D5', name: '★고장원인(FC)', level: 'FC', db: b4v, parent: '—' });

  // ─── 출력 ───
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`레벨  코드  항목                    DB  parent`);
  console.log(`${'─'.repeat(60)}`);
  let lv = '';
  for (const r of rs) {
    if (r.level !== lv) { lv = r.level; }
    const flag = r.db === 0 ? '⚠️' : '  ';
    console.log(`${flag}${r.level.padEnd(4)} ${r.code.padEnd(4)} ${r.name.padEnd(20)} ${String(r.db).padStart(5)}  ${r.parent}`);
  }
  console.log(`${'─'.repeat(40)} FL: ${flCount}건`);

  // ─── FK 검증 ───
  console.log(`\n📊 FK 무결성`);
  const fks: { n: string; q: string }[] = [
    { n: 'L3.l2Id → L2', q: `SELECT count(*) FROM l3_structures l3 WHERE l3."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id=l3."l2Id" AND l2."fmeaId"=$1)` },
    { n: 'L2F.l2StructId→L2', q: `SELECT count(*) FROM l2_functions f WHERE f."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id=f."l2StructId" AND l2."fmeaId"=$1)` },
    { n: 'L3F.l3StructId→L3', q: `SELECT count(*) FROM l3_functions f WHERE f."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l3_structures l3 WHERE l3.id=f."l3StructId" AND l3."fmeaId"=$1)` },
    { n: 'L3F.l2StructId→L2', q: `SELECT count(*) FROM l3_functions f WHERE f."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id=f."l2StructId" AND l2."fmeaId"=$1)` },
    { n: 'FM.l2StructId→L2', q: `SELECT count(*) FROM failure_modes fm WHERE fm."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id=fm."l2StructId" AND l2."fmeaId"=$1)` },
    { n: 'FE.l1FuncId→L1F', q: `SELECT count(*) FROM failure_effects fe WHERE fe."fmeaId"=$1 AND fe."l1FuncId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM l1_functions l1 WHERE l1.id=fe."l1FuncId" AND l1."fmeaId"=$1)` },
    { n: 'FC.l3FuncId→L3F', q: `SELECT count(*) FROM failure_causes fc WHERE fc."fmeaId"=$1 AND fc."l3FuncId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM l3_functions l3f WHERE l3f.id=fc."l3FuncId" AND l3f."fmeaId"=$1)` },
    { n: 'FC.l3StructId→L3', q: `SELECT count(*) FROM failure_causes fc WHERE fc."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l3_structures l3 WHERE l3.id=fc."l3StructId" AND l3."fmeaId"=$1)` },
    { n: 'FL.fmId→FM', q: `SELECT count(*) FROM failure_links fl WHERE fl."fmeaId"=$1 AND fl."deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id=fl."fmId" AND fm."fmeaId"=$1)` },
    { n: 'FL.feId→FE', q: `SELECT count(*) FROM failure_links fl WHERE fl."fmeaId"=$1 AND fl."deletedAt" IS NULL AND fl."feId"!='' AND NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id=fl."feId" AND fe."fmeaId"=$1)` },
    { n: 'FL.fcId→FC', q: `SELECT count(*) FROM failure_links fl WHERE fl."fmeaId"=$1 AND fl."deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id=fl."fcId" AND fc."fmeaId"=$1)` },
    { n: 'RA.linkId→FL', q: `SELECT count(*) FROM risk_analyses ra WHERE ra."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl.id=ra."linkId" AND fl."fmeaId"=$1)` },
  ];
  let tot = 0;
  for (const f of fks) {
    try {
      const c = parseInt((await pool.query(f.q, [fid])).rows[0].count);
      tot += c;
      console.log(`  ${c === 0 ? '✅' : '❌'} ${f.n}: ${c === 0 ? 'OK' : `고아 ${c}건`}`);
    } catch (e: any) { console.log(`  ⚠️ ${f.n}: ${e.message?.slice(0, 50)}`); }
  }

  // ─── 동기화 갭 ───
  console.log(`\n📊 동기화 갭`);
  try {
    const l2no3 = await pool.query(`SELECT l2.no, l2.name FROM l2_structures l2 WHERE l2."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM l3_structures l3 WHERE l3."l2Id"=l2.id AND l3."fmeaId"=$1)`, [fid]);
    console.log(`  ${l2no3.rows.length === 0 ? '✅' : '⚠️'} L3없는 L2: ${l2no3.rows.length}건${l2no3.rows.length > 0 ? ` (${l2no3.rows.slice(0, 3).map((r: any) => `${r.no}.${r.name}`).join(', ')})` : ''}`);
  } catch {}
  try {
    const l3noF = await pool.query(`SELECT l3.name,l3.m4 FROM l3_structures l3 WHERE l3."fmeaId"=$1 AND l3.name!='' AND NOT EXISTS (SELECT 1 FROM l3_functions f WHERE f."l3StructId"=l3.id AND f."fmeaId"=$1)`, [fid]);
    console.log(`  ${l3noF.rows.length === 0 ? '✅' : '⚠️'} L3F없는 WE: ${l3noF.rows.length}건${l3noF.rows.length > 0 ? ` (${l3noF.rows.slice(0, 3).map((r: any) => `[${r.m4}]${r.name}`).join(', ')})` : ''}`);
  } catch {}
  try {
    const feN = parseInt((await pool.query(`SELECT count(*) FROM failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL AND ("feId" IS NULL OR "feId"='')`, [fid])).rows[0].count);
    console.log(`  ${feN === 0 ? '✅' : '⚠️'} FL.feId NULL: ${feN}건`);
  } catch {}
  try {
    const fmN = parseInt((await pool.query(`SELECT count(*) FROM failure_modes fm WHERE fm."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fmId"=fm.id AND fl."fmeaId"=$1 AND fl."deletedAt" IS NULL)`, [fid])).rows[0].count);
    console.log(`  ${fmN === 0 ? '✅' : '⚠️'} FL없는 FM: ${fmN}건/${a5v}건`);
  } catch {}
  try {
    const fcN = parseInt((await pool.query(`SELECT count(*) FROM failure_causes fc WHERE fc."fmeaId"=$1 AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fcId"=fc.id AND fl."fmeaId"=$1 AND fl."deletedAt" IS NULL)`, [fid])).rows[0].count);
    console.log(`  ${fcN === 0 ? '✅' : '⚠️'} FL없는 FC: ${fcN}건/${b4v}건`);
  } catch {}

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FK 고아 총: ${tot}건 ${tot === 0 ? '✅ ALL OK' : '❌'}`);
  const z = rs.filter(r => r.db === 0 && !['A4', 'A6', 'B5'].includes(r.code));
  if (z.length > 0) console.log(`  ⚠️ 0건: ${z.map(e => e.code).join(', ')}`);
  console.log(`${'═'.repeat(60)}\n`);

  await pool.end();
}

async function main() {
  const fmeaId = process.argv[2];
  if (!fmeaId) {
    const p = new pg.Pool({ connectionString: DATABASE_URL.replace(/\?.*/, '') });
    const r = await p.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name`);
    console.log('\n프로젝트 목록:');
    r.rows.forEach((x: any) => console.log(`  ${x.schema_name.replace('pfmea_', '')}`));
    console.log(`\n사용법: npx tsx scripts/verify-worksheet-db-sync.ts <fmeaId>`);
    await p.end(); return;
  }
  await verifyProject(fmeaId);
}

main().catch(console.error);
