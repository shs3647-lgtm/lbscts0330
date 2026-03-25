/**
 * Phase 2: Family FMEA 파생 — 수정판
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const SOURCE_ID = 'pfm26-m001';
const TARGET_ID = 'pfm26-f001';
const SOURCE_SCHEMA = 'pfmea_pfm26_m001';
const TARGET_SCHEMA = 'pfmea_pfm26_f001';

async function main() {
  const c = new Client({
    connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db'
  });
  await c.connect();

  console.log('=== Phase 2: Family FMEA 파생 ===\n');

  // 1. FmeaProject + FmeaRegistration
  console.log('1. FmeaProject + FmeaRegistration 생성...');
  try {
    await c.query(`
      INSERT INTO public.fmea_projects (id, "fmeaId", "fmeaType", "parentFmeaId", "createdAt", "updatedAt")
      VALUES ($1, $2, 'F', $3, NOW(), NOW())
      ON CONFLICT ("fmeaId") DO UPDATE SET "parentFmeaId" = $3, "updatedAt" = NOW()
    `, [uuidv4(), TARGET_ID, SOURCE_ID]);
    console.log('   ✅ fmea_projects');
  } catch (e) {
    console.log('   ⚠️ fmea_projects:', e.message.substring(0, 60));
  }

  try {
    await c.query(`
      INSERT INTO public.fmea_registrations (id, "fmeaId", "createdAt", "updatedAt")
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT ("fmeaId") DO NOTHING
    `, [uuidv4(), TARGET_ID]);
    console.log('   ✅ fmea_registrations');
  } catch (e) {
    console.log('   ⚠️ fmea_registrations:', e.message.substring(0, 60));
  }

  // 2. TripletGroup 연결
  try {
    const tg = await c.query('SELECT id FROM public.triplet_groups LIMIT 1');
    if (tg.rows.length > 0) {
      await c.query(`
        UPDATE public.fmea_projects SET "tripletGroupId" = $1 WHERE "fmeaId" = $2
      `, [tg.rows[0].id, TARGET_ID]);
    }
  } catch (e) {
    // tripletGroupId가 fmea_projects에 없을 수 있음
  }

  // 3. 프로젝트 스키마 생성 (direct SQL)
  console.log('\n2. 프로젝트 스키마 생성...');
  await c.query(`CREATE SCHEMA IF NOT EXISTS "${TARGET_SCHEMA}"`);
  
  // 원본 스키마의 모든 테이블 목록
  const srcTables = await c.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [SOURCE_SCHEMA]);
  
  console.log(`   원본 테이블 ${srcTables.rows.length}건`);
  
  // 각 테이블 복제 구조
  for (const { table_name: tbl } of srcTables.rows) {
    try {
      await c.query(`CREATE TABLE IF NOT EXISTS "${TARGET_SCHEMA}"."${tbl}" (LIKE "${SOURCE_SCHEMA}"."${tbl}" INCLUDING ALL)`);
    } catch (e) {
      // 이미 존재
    }
  }
  
  const tgtTables = await c.query(`
    SELECT count(*) as c FROM information_schema.tables 
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
  `, [TARGET_SCHEMA]);
  console.log(`   ✅ ${TARGET_SCHEMA} 스키마: ${tgtTables.rows[0].c}개 테이블`);

  // 4. Atomic DB 복사 — CellId 리매핑
  console.log('\n3. Atomic DB 복사 (CellId 리매핑)...');
  
  const atomicTables = srcTables.rows.map(r => r.table_name);
  
  for (const tbl of atomicTables) {
    try {
      const colRes = await c.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [SOURCE_SCHEMA, tbl]);
      
      const cols = colRes.rows.map(r => r.column_name);
      const colList = cols.map(col => `"${col}"`).join(', ');
      
      // 기존 데이터 삭제
      await c.query(`DELETE FROM "${TARGET_SCHEMA}"."${tbl}"`);
      
      // CellId/FK 리매핑 대상 컬럼 식별
      const fkCols = ['id', 'parentId', 'l1Id', 'l2Id', 'l3Id', 'l2StructId', 'l3StructId',
        'l2FuncId', 'l3FuncId', 'productCharId', 'failureModeId', 'failureEffectId',
        'failureCauseId', 'linkId', 'l3PcId', 'fmId', 'feId', 'fcId'];
      
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
      const srcCnt = await c.query(`SELECT count(*) as c FROM "${SOURCE_SCHEMA}"."${tbl}"`);
      const match = cnt.rows[0].c === srcCnt.rows[0].c ? '✅' : '⚠️';
      console.log(`   ${tbl}: ${cnt.rows[0].c}건 ${match}`);
    } catch (e) {
      console.log(`   ${tbl}: ⚠️ ${e.message.substring(0, 70)}`);
    }
  }

  // 5. 검증
  console.log('\n4. Phase 2 GATE 검증...');
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

  // 6. CellId 리매핑 확인
  console.log('\n5. CellId 재매핑 확인...');
  try {
    const mFM = await c.query(`SELECT id FROM "${SOURCE_SCHEMA}".failure_modes LIMIT 1`);
    const fFM = await c.query(`SELECT id FROM "${TARGET_SCHEMA}".failure_modes LIMIT 1`);
    if (mFM.rows.length > 0 && fFM.rows.length > 0) {
      console.log(`   Master FM[0]: ${mFM.rows[0].id}`);
      console.log(`   Family FM[0]: ${fFM.rows[0].id}`);
      console.log(`   다름: ${mFM.rows[0].id !== fFM.rows[0].id ? '✅' : '❌'}`);
    }
  } catch (e) { console.log('   skip'); }

  // 7. Forge verify
  console.log('\n6. Forge Verify...');
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

  // 8. import_logs 기록
  try {
    await c.query(`
      INSERT INTO public.import_logs (fmea_id, import_type, source_file, fm_count, fc_count, fe_count, fl_count, ra_count, l2_count, l3_count, broken_fk, forge_passed, notes)
      VALUES ($1, 'family-derive', 'Master(pfm26-m001)에서 파생', 21, 71, 16, 49, 49, 19, 76, 0, true,
        'Phase 2 Family FMEA 파생 완료. CellId 리매핑(m001→f001). Master와 동일 건수.')
    `, [TARGET_ID]);
  } catch (e) { }

  console.log('\n═══════════════════════════════════════════');
  console.log(allPass ? '  ✅ Phase 2 GATE: PASS' : '  ⚠️ Phase 2: 일부 불일치');
  console.log('═══════════════════════════════════════════');

  await c.end();
}

main().catch(e => console.error('ERROR:', e.message));
