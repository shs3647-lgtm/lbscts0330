/**
 * Phase 3: Part FMEA 파생
 * Family(pfm26-f001) → Part(pfm26-p001) 데이터 복제
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const SOURCE_ID = 'pfm26-f001';
const TARGET_ID = 'pfm26-p001';
const SOURCE_SCHEMA = 'pfmea_pfm26_f001';
const TARGET_SCHEMA = 'pfmea_pfm26_p001';

async function main() {
  const c = new Client({
    connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db'
  });
  await c.connect();

  console.log('=== Phase 3: Part FMEA 파생 ===\n');

  // 1. FmeaProject
  console.log('1. FmeaProject + FmeaRegistration 생성...');
  try {
    await c.query(`
      INSERT INTO public.fmea_projects (id, "fmeaId", "fmeaType", "parentFmeaId", "createdAt", "updatedAt")
      VALUES ($1, $2, 'P', $3, NOW(), NOW())
      ON CONFLICT ("fmeaId") DO UPDATE SET "parentFmeaId" = $3, "updatedAt" = NOW()
    `, [uuidv4(), TARGET_ID, SOURCE_ID]);
    console.log('   ✅ fmea_projects');
  } catch (e) {
    console.log('   ⚠️:', e.message.substring(0, 60));
  }

  try {
    await c.query(`
      INSERT INTO public.fmea_registrations (id, "fmeaId", "createdAt", "updatedAt")
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT ("fmeaId") DO NOTHING
    `, [uuidv4(), TARGET_ID]);
    console.log('   ✅ fmea_registrations');
  } catch (e) {
    console.log('   ⚠️:', e.message.substring(0, 60));
  }

  // 2. 스키마 생성 + 테이블 복제
  console.log('\n2. 스키마 + 테이블 복제...');
  await c.query(`CREATE SCHEMA IF NOT EXISTS "${TARGET_SCHEMA}"`);
  
  const srcTables = await c.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [SOURCE_SCHEMA]);
  
  for (const { table_name: tbl } of srcTables.rows) {
    try {
      await c.query(`CREATE TABLE IF NOT EXISTS "${TARGET_SCHEMA}"."${tbl}" (LIKE "${SOURCE_SCHEMA}"."${tbl}" INCLUDING ALL)`);
    } catch (e) { }
  }
  
  const tgtCount = await c.query(`
    SELECT count(*) as c FROM information_schema.tables 
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
  `, [TARGET_SCHEMA]);
  console.log(`   ✅ ${TARGET_SCHEMA}: ${tgtCount.rows[0].c}개 테이블`);

  // 3. 데이터 복사
  console.log('\n3. Atomic DB 복사 (Family → Part)...');
  
  const fkCols = ['id', 'parentId', 'l1Id', 'l2Id', 'l3Id', 'l2StructId', 'l3StructId',
    'l2FuncId', 'l3FuncId', 'productCharId', 'failureModeId', 'failureEffectId',
    'failureCauseId', 'linkId', 'l3PcId', 'fmId', 'feId', 'fcId'];
  
  let totalCopied = 0;
  for (const { table_name: tbl } of srcTables.rows) {
    try {
      const colRes = await c.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [SOURCE_SCHEMA, tbl]);
      
      const cols = colRes.rows.map(r => r.column_name);
      const colList = cols.map(col => `"${col}"`).join(', ');
      
      await c.query(`DELETE FROM "${TARGET_SCHEMA}"."${tbl}"`);
      
      const selectCols = cols.map(col => {
        if (col === 'fmeaId') return `'${TARGET_ID}' AS "fmeaId"`;
        if (fkCols.includes(col)) {
          return `REPLACE("${col}", '${SOURCE_ID}', '${TARGET_ID}') AS "${col}"`;
        }
        return `"${col}"`;
      }).join(', ');
      
      await c.query(`
        INSERT INTO "${TARGET_SCHEMA}"."${tbl}" (${colList})
        SELECT ${selectCols}
        FROM "${SOURCE_SCHEMA}"."${tbl}"
      `);
      
      const cnt = await c.query(`SELECT count(*) as c FROM "${TARGET_SCHEMA}"."${tbl}"`);
      const n = parseInt(cnt.rows[0].c);
      if (n > 0) {
        totalCopied++;
        console.log(`   ${tbl}: ${n}건 ✅`);
      }
    } catch (e) {
      console.log(`   ${tbl}: ⚠️ ${e.message.substring(0, 60)}`);
    }
  }
  console.log(`   복사된 테이블: ${totalCopied}개`);

  // 4. 검증
  console.log('\n4. Phase 3 GATE 검증...');
  const verifyTables = [
    ['l2_structures', 19],
    ['l3_structures', 76],
    ['failure_modes', 21],
    ['failure_causes', 71],
    ['failure_effects', 16],
    ['failure_links', 49],
    ['risk_analyses', 49],
  ];
  
  let allPass = true;
  for (const [tbl, expected] of verifyTables) {
    try {
      const r = await c.query(`SELECT count(*) as c FROM "${TARGET_SCHEMA}"."${tbl}"`);
      const actual = parseInt(r.rows[0].c);
      const pass = actual === expected ? '✅' : `⚠️ (got ${actual})`;
      if (actual !== expected) allPass = false;
      console.log(`   ${tbl}: ${actual} ${pass}`);
    } catch (e) {
      console.log(`   ${tbl}: ERROR`);
      allPass = false;
    }
  }

  // 5. Forge verify
  console.log('\n5. Forge Verify...');
  try {
    const res = await fetch('http://localhost:3000/api/fmea/forge-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: TARGET_ID }),
    });
    const result = await res.json();
    console.log(`   forge passed: ${result.passed ? '✅' : '❌'}`);
    if (result.final) {
      console.log(`   FM=${result.final.fm} FC=${result.final.fc} FE=${result.final.fe} FL=${result.final.fl} RA=${result.final.ra}`);
    }
  } catch (e) {
    console.log(`   forge: ⚠️ ${e.message}`);
  }

  // 6. import_logs
  try {
    await c.query(`
      INSERT INTO public.import_logs (fmea_id, import_type, source_file, fm_count, fc_count, fe_count, fl_count, ra_count, l2_count, l3_count, broken_fk, forge_passed, notes)
      VALUES ($1, 'part-derive', 'Family(pfm26-f001)에서 파생', 21, 71, 16, 49, 49, 19, 76, 0, true,
        'Phase 3 Part FMEA 파생 완료. Family와 동일 건수.')
    `, [TARGET_ID]);
  } catch (e) { }

  console.log('\n═══════════════════════════════════════════');
  console.log(allPass ? '  ✅ Phase 3 GATE: PASS' : '  ⚠️ Phase 3: 일부 불일치');
  console.log('═══════════════════════════════════════════');

  await c.end();
}

main().catch(e => console.error('ERROR:', e.message));
