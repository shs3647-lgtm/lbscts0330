import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function cleanAll() {
  const client = await pool.connect();
  try {
    // 1. 프로젝트 스키마 목록 조회
    const schemas = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name`
    );
    console.log(`\n=== 프로젝트 스키마 삭제: ${schemas.rows.length}개 ===`);

    // 배치로 나누어 삭제 (5개씩)
    const batchSize = 5;
    for (let i = 0; i < schemas.rows.length; i += batchSize) {
      const batch = schemas.rows.slice(i, i + batchSize);
      await client.query('BEGIN');
      for (const s of batch) {
        console.log(`  DROP SCHEMA ${s.schema_name} CASCADE`);
        await client.query(`DROP SCHEMA IF EXISTS "${s.schema_name}" CASCADE`);
      }
      await client.query('COMMIT');
      console.log(`  → batch ${Math.floor(i / batchSize) + 1} committed`);
    }

    // 2. Public 프로젝트 데이터 삭제
    console.log('\n=== Public 프로젝트 데이터 삭제 ===');
    await client.query('BEGIN');

    const deletes = [
      ['fmea_cft_members', `DELETE FROM fmea_cft_members`],
      ['fmea_worksheet_data', `DELETE FROM fmea_worksheet_data`],
      ['fmea_registrations', `DELETE FROM fmea_registrations`],
      ['fmea_projects', `DELETE FROM fmea_projects`],
      ['pfmea_master_flat_items', `DELETE FROM pfmea_master_flat_items`],
      ['pfmea_master_datasets', `DELETE FROM pfmea_master_datasets`],
      ['fmea_confirmed_states', `DELETE FROM fmea_confirmed_states`],
    ];

    for (const [name, sql] of deletes) {
      try {
        const r = await client.query(sql);
        console.log(`  ${name}: ${r.rowCount} deleted`);
      } catch (e) {
        console.log(`  ${name}: skip (${e.message.substring(0, 50)})`);
      }
    }

    // master_fmea_reference
    try {
      const r = await client.query(`DELETE FROM master_fmea_reference`);
      console.log(`  master_fmea_reference: ${r.rowCount} deleted`);
    } catch (e) {
      console.log(`  master_fmea_reference: skip`);
    }

    // triplet_groups
    try {
      const r = await client.query(`DELETE FROM triplet_groups`);
      console.log(`  triplet_groups: ${r.rowCount} deleted`);
    } catch (e) {
      console.log(`  triplet_groups: skip (${e.message.substring(0, 50)})`);
    }

    // fmea_sod_history (비어있음)
    try {
      const r = await client.query(`DELETE FROM fmea_sod_history`);
      console.log(`  fmea_sod_history: ${r.rowCount} deleted`);
    } catch (e) {}

    await client.query('COMMIT');

    // 3. 보존 데이터 확인
    console.log('\n=== 보존 데이터 확인 ===');
    const keepTables = [
      ['lld_filter_code', 'LLD FilterCode'],
      ['lessons_learned', 'Lessons Learned'],
      ['kr_industry_detection', 'KR Industry Detection'],
      ['kr_industry_prevention', 'KR Industry Prevention'],
      ['continuous_improvement_plan', 'CIP'],
      ['pfmea_severity_criteria', 'SOD Severity Criteria'],
      ['severity_usage_records', 'SOD Usage Records'],
    ];
    for (const [name, label] of keepTables) {
      try {
        const cnt = await client.query(`SELECT count(*)::int as cnt FROM "${name}"`);
        console.log(`  ${label}: ${cnt.rows[0].cnt} (preserved)`);
      } catch (e) {
        console.log(`  ${label}: N/A`);
      }
    }

    // 4. 스키마 잔존 확인
    const remaining = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%'`
    );
    console.log(`\n=== 잔존 PFMEA 스키마: ${remaining.rows.length}개 ===`);
    remaining.rows.forEach(s => console.log(`  ${s.schema_name}`));

    // 5. 프로젝트 잔존 확인
    const remProj = await client.query(`SELECT "fmeaId" FROM fmea_projects`);
    console.log(`\n=== 잔존 프로젝트: ${remProj.rows.length}개 ===`);

    console.log('\n=== DONE ===');

  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('ERROR:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanAll().catch(e => { console.error(e); process.exit(1); });
