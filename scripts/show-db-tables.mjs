import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();

const schema = 'pfmea_pfm26_m066';

console.log('');
console.log('='.repeat(90));
console.log(`  DB: fmea_db / Schema: ${schema}`);
console.log(`  프로젝트: pfm26-m066 (12inch Au Bump)`);
console.log('='.repeat(90));

// 테이블 목록 + 행 수
const tables = await c.query(`
  SELECT table_name, 
    (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count
  FROM (
    SELECT table_name, 
      query_to_xml(format('SELECT COUNT(*) AS cnt FROM "%s"."%s"', '${schema}', table_name), false, true, '') AS xml_count
    FROM information_schema.tables 
    WHERE table_schema = '${schema}' 
    ORDER BY table_name
  ) t
`);

console.log(`\n  ${'테이블명'.padEnd(30)} 행 수   설명`);
console.log('  ' + '-'.repeat(85));
const desc = {
  'l1_structures': 'L1 완제품 구조',
  'l1_functions': 'L1 완제품 기능 (요구사항 포함)',
  'l2_structures': 'L2 공정 구조 (공정번호/공정명)',
  'l2_functions': 'L2 공정 기능 (제품특성 포함)',
  'l3_structures': 'L3 작업요소 (4M/WE)',
  'l3_functions': 'L3 요소기능 (공정특성 포함)',
  'failure_effects': '★ FE 고장영향 (C4)',
  'failure_modes': '★ FM 고장형태 (A5)',
  'failure_causes': '★ FC 고장원인 (B4)',
  'failure_links': '★★★ 고장사슬 (FE-FM-FC FK연결)',
  'risk_analyses': '★★ 위험분석 (S/O/D/PC/DC)',
  'optimizations': '최적화 (개선활동)',
  'process_product_chars': '공정/제품 특성',
};
for (const t of tables.rows) {
  const d = desc[t.table_name] || '';
  const star = d.startsWith('★') ? ' ◀◀◀' : '';
  console.log(`  ${t.table_name.padEnd(30)} ${String(t.row_count).padStart(5)}   ${d}${star}`);
}

// failure_links 샘플 (고장사슬 핵심)
console.log('\n' + '='.repeat(90));
console.log('  ★★★ failure_links (고장사슬) — 상위 20건');
console.log('='.repeat(90));

const links = await c.query(`
  SELECT 
    fl.id,
    fl."fmText" AS fm,
    fl."feText" AS fe,
    fl."feScope" AS fe_scope,
    fl."fcText" AS fc,
    fl."fcWorkElem" AS we,
    fl."fcM4" AS m4
  FROM "${schema}".failure_links fl
  WHERE fl."deletedAt" IS NULL
  ORDER BY fl."fmProcess", fl."fmText", fl."fcText"
  LIMIT 20
`);

console.log(`  ${'FM(고장형태)'.padEnd(30)} ${'FE(고장영향)'.padEnd(35)} ${'FC(고장원인)'.padEnd(25)} M4   WE`);
console.log('  ' + '-'.repeat(85));
for (const r of links.rows) {
  console.log(`  ${(r.fm||'').substring(0,28).padEnd(30)} ${(r.fe||'').substring(0,33).padEnd(35)} ${(r.fc||'').substring(0,23).padEnd(25)} ${(r.m4||'').padEnd(4)} ${(r.we||'').substring(0,20)}`);
}

// risk_analyses 샘플
console.log('\n' + '='.repeat(90));
console.log('  ★★ risk_analyses (위험분석) — 상위 10건');
console.log('='.repeat(90));

const risks = await c.query(`
  SELECT 
    ra.id,
    fl."fmText" AS fm,
    fl."fcText" AS fc,
    ra.severity AS s,
    ra.occurrence AS o,
    ra.detection AS d,
    ra.ap,
    ra."preventionControl" AS pc,
    ra."detectionControl" AS dc
  FROM "${schema}".risk_analyses ra
  JOIN "${schema}".failure_links fl ON ra."linkId" = fl.id
  WHERE fl."deletedAt" IS NULL
  ORDER BY ra.severity DESC, ra.occurrence DESC
  LIMIT 10
`);

console.log(`  ${'FM'.padEnd(28)} ${'FC'.padEnd(25)} S  O  D  AP  ${'PC(예방관리)'.padEnd(35)} DC(검출관리)`);
console.log('  ' + '-'.repeat(85));
for (const r of risks.rows) {
  console.log(`  ${(r.fm||'').substring(0,26).padEnd(28)} ${(r.fc||'').substring(0,23).padEnd(25)} ${String(r.s||'').padStart(2)} ${String(r.o||'').padStart(2)} ${String(r.d||'').padStart(2)} ${(r.ap||'').padEnd(3)} ${(r.pc||'').substring(0,33).padEnd(35)} ${(r.dc||'').substring(0,30)}`);
}

// N:1:N 요약
console.log('\n' + '='.repeat(90));
console.log('  고장사슬 N:1:N 연결 요약');
console.log('='.repeat(90));

const summary = await c.query(`
  SELECT 
    fm."mode" AS fm_name,
    COUNT(DISTINCT fl."feId") AS fe_cnt,
    COUNT(DISTINCT fl."fcId") AS fc_cnt,
    COUNT(fl.id) AS total_links
  FROM "${schema}".failure_links fl
  JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id
  WHERE fl."deletedAt" IS NULL
  GROUP BY fm.id, fm."mode"
  ORDER BY COUNT(fl.id) DESC
  LIMIT 10
`);

console.log(`  ${'FM(고장형태)'.padEnd(48)} FE수  FC수  총Link`);
console.log('  ' + '-'.repeat(75));
for (const r of summary.rows) {
  console.log(`  ${r.fm_name.substring(0,46).padEnd(48)} ${String(r.fe_cnt).padStart(3)}   ${String(r.fc_cnt).padStart(3)}   ${String(r.total_links).padStart(5)}`);
}

console.log('\n  ※ Prisma Studio에서는 public 스키마만 보입니다.');
console.log(`  ※ 고장사슬 데이터는 "${schema}" 스키마에 저장되어 있습니다.`);
console.log('  ※ pgAdmin 또는 DBeaver에서 해당 스키마를 선택하면 볼 수 있습니다.\n');

await c.end();
