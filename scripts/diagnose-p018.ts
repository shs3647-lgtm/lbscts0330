import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'1234',database:'fmea_db'});

async function main() {
  const S = 'pfmea_pfm26_p018_i18';
  const q = (t: string) => `"${S}".${t}`;

  console.log('=== 1. L3Function processChar 상태 ===');
  const l3f = await pool.query(`
    SELECT l3f.id, l3f."functionName", l3f."processChar", l3f."l3StructId", l3s.m4, l3s.name as we_name
    FROM ${q('l3_functions')} l3f
    LEFT JOIN ${q('l3_structures')} l3s ON l3s.id = l3f."l3StructId"
    ORDER BY l3s.m4, l3s.name
  `);
  let empty = 0, filled = 0;
  for (const r of l3f.rows) {
    if (!r.processChar || r.processChar.trim() === '') {
      empty++;
      if (empty <= 10) console.log(`  ❌ EMPTY: ${r.m4}|${r.we_name?.substring(0,25)} | func: ${r.functionName?.substring(0,25)}`);
    } else {
      filled++;
    }
  }
  console.log(`  전체: ${l3f.rows.length}, 채움: ${filled}, 빈값: ${empty}`);

  console.log('\n=== 2. L3ProcessChar 테이블 존재 여부 ===');
  const pcTable = await pool.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=$1 AND table_name='l3_process_chars'`, [S]);
  console.log(`  l3_process_chars 테이블: ${pcTable.rows[0].count > 0 ? '있음' : '없음'}`);
  if (+pcTable.rows[0].count > 0) {
    const pc = await pool.query(`SELECT COUNT(*) FROM ${q('l3_process_chars')}`);
    console.log(`  l3_process_chars 건수: ${pc.rows[0].count}`);
    const pcSample = await pool.query(`SELECT * FROM ${q('l3_process_chars')} LIMIT 5`);
    pcSample.rows.forEach((r: any) => console.log(`    ${JSON.stringify(r)}`));
  }

  console.log('\n=== 3. FC→FL 미연결 상세 ===');
  const orphanFC = await pool.query(`
    SELECT fc.id, fc.cause, fc."l3StructId", l3s.m4, l3s.name as we_name
    FROM ${q('failure_causes')} fc
    LEFT JOIN ${q('l3_structures')} l3s ON l3s.id = fc."l3StructId"
    WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_links')} fl WHERE fl."fcId" = fc.id)
    ORDER BY l3s.m4, fc.cause
  `);
  console.log(`  FC→FL 미연결: ${orphanFC.rows.length}건`);
  const byM4: Record<string, number> = {};
  for (const r of orphanFC.rows) {
    byM4[r.m4 || 'NULL'] = (byM4[r.m4 || 'NULL'] || 0) + 1;
    if (Object.values(byM4).reduce((a, b) => a + b, 0) <= 10) {
      console.log(`    ${r.m4}|${r.we_name?.substring(0,20)}| ${r.cause?.substring(0,40)}`);
    }
  }
  console.log('  m4별:', byM4);

  console.log('\n=== 4. FailureLink의 FC 참조 분포 ===');
  const flFcDist = await pool.query(`
    SELECT fc."l3StructId", l3s.m4, l3s.name as we_name, COUNT(*) as fl_cnt
    FROM ${q('failure_links')} fl
    JOIN ${q('failure_causes')} fc ON fc.id = fl."fcId"
    JOIN ${q('l3_structures')} l3s ON l3s.id = fc."l3StructId"
    GROUP BY fc."l3StructId", l3s.m4, l3s.name
    ORDER BY fl_cnt DESC
  `);
  console.log('  FL→FC L3별 분포:');
  flFcDist.rows.forEach((r: any) => console.log(`    ${r.m4}|${r.we_name?.substring(0,20)}: FL ${r.fl_cnt}건`));

  console.log('\n=== 5. MasterDataset flatData B3 건수 ===');
  const md = await pool.query(`SELECT "flatItems" FROM pfmea_master_flat_items WHERE "fmeaId" = 'pfm26-p018-i18'`);
  if (md.rows.length > 0) {
    const items = md.rows[0].flatItems;
    if (items) {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      const b3 = parsed.filter((i: any) => i.itemCode === 'B3');
      const b4 = parsed.filter((i: any) => i.itemCode === 'B4');
      const b2 = parsed.filter((i: any) => i.itemCode === 'B2');
      console.log(`  flatItems 전체: ${parsed.length}`);
      console.log(`  B2: ${b2.length}, B3: ${b3.length}, B4: ${b4.length}`);
      if (b3.length > 0) {
        console.log('  B3 샘플:');
        b3.slice(0, 5).forEach((i: any) => console.log(`    ${i.processNo}|${i.m4}|${i.value?.substring(0,40)}`));
      }
    }
  } else {
    console.log('  flatItems NOT FOUND');
  }

  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
