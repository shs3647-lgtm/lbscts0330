import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function safeCount(client, sql, params) {
  try {
    const r = await client.query(sql, params);
    return r.rows[0]?.cnt ?? 0;
  } catch (e) {
    return `N/A (${e.message.substring(0, 40)})`;
  }
}

async function check() {
  const client = await pool.connect();
  try {
    // 1. 전체 프로젝트
    const allProjects = await client.query(
      `SELECT p."fmeaId", p."fmeaType", r.subject FROM fmea_projects p LEFT JOIN fmea_registrations r ON p."fmeaId" = r."fmeaId" ORDER BY p."createdAt" DESC`
    );
    console.log('=== All FmeaProjects ===');
    allProjects.rows.forEach(p => console.log(`  ${p.fmeaId} | ${p.subject}`));
    if (allProjects.rows.length === 0) console.log('  (none)');

    // 2. 보존할 데이터
    console.log('\n=== KEEP: LLD/산업DB/SOD ===');
    console.log(`  LLD FilterCode: ${await safeCount(client, 'SELECT count(*)::int as cnt FROM lld_filter_code')}`);
    console.log(`  Lessons Learned: ${await safeCount(client, 'SELECT count(*)::int as cnt FROM lessons_learned')}`);
    console.log(`  KR Industry Detection: ${await safeCount(client, 'SELECT count(*)::int as cnt FROM kr_industry_detection')}`);
    console.log(`  KR Industry Prevention: ${await safeCount(client, 'SELECT count(*)::int as cnt FROM kr_industry_prevention')}`);
    console.log(`  CIP: ${await safeCount(client, 'SELECT count(*)::int as cnt FROM continuous_improvement_plan')}`);

    // SOD tables
    const sodTables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%sod%' OR table_name LIKE '%rating%' OR table_name LIKE '%severity%')`
    );
    for (const t of sodTables.rows) {
      console.log(`  ${t.table_name}: ${await safeCount(client, `SELECT count(*)::int as cnt FROM "${t.table_name}"`)}`);
    }

    // 3. m002 관련 public 테이블 데이터
    console.log('\n=== DELETE: m002 related public data ===');
    const publicTables = [
      'fmea_legacy_data', 'pfmea_master_datasets', 'fmea_confirmed_states',
      'master_fmea_reference', 'fmea_registrations', 'fmea_worksheet_data',
      'fmea_cft_members', 'import_validations'
    ];
    for (const t of publicTables) {
      const cnt = await safeCount(client, `SELECT count(*)::int as cnt FROM "${t}" WHERE "fmeaId" = $1`, ['pfm26-m002']);
      console.log(`  ${t}: ${cnt}`);
    }

    // 4. 모든 PFMEA 스키마
    const schemas = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name`
    );
    console.log('\n=== All PFMEA Schemas ===');
    schemas.rows.forEach(s => console.log(`  ${s.schema_name}`));
    if (schemas.rows.length === 0) console.log('  (none)');

    // 5. m002 스키마 테이블
    const m002s = schemas.rows.find(s => s.schema_name.includes('m002'));
    if (m002s) {
      const tables = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
        [m002s.schema_name]
      );
      console.log(`\n=== DELETE: ${m002s.schema_name} (${tables.rows.length} tables) ===`);
      for (const t of tables.rows) {
        const cnt = await safeCount(client, `SELECT count(*)::int as cnt FROM "${m002s.schema_name}"."${t.table_name}"`);
        console.log(`  ${t.table_name}: ${cnt}`);
      }
    } else {
      console.log('\n=== No m002 schema found ===');
    }

    // 6. 다른 프로젝트 스키마
    const otherSchemas = schemas.rows.filter(s => !s.schema_name.includes('m002'));
    if (otherSchemas.length > 0) {
      console.log('\n=== Other project schemas ===');
      otherSchemas.forEach(s => console.log(`  ${s.schema_name}`));
    }

    // 7. TripletGroups
    const tgs = await client.query(`SELECT id, name FROM triplet_groups LIMIT 20`);
    console.log('\n=== TripletGroups ===');
    tgs.rows.forEach(t => console.log(`  ${t.id} | ${t.name}`));
    if (tgs.rows.length === 0) console.log('  (none)');

    // 8. master JSON 파일
    console.log('\n=== Master JSON files ===');
    const fs = await import('fs');
    const masterDir = 'data/master-fmea';
    try {
      const files = fs.readdirSync(masterDir);
      files.forEach(f => console.log(`  ${f}`));
    } catch (e) {
      console.log('  (directory not found)');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => { console.error(e.message); process.exit(1); });
