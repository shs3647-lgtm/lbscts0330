import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres:1234@localhost:5432/fmea_db';
const FMEA_ID = 'pfm26-m004';
const SCHEMA_NAME = 'pfmea_pfm26_m004';

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// 1. Check if project exists
const existing = await pool.query(`SELECT id, "fmeaId" FROM fmea_projects WHERE "fmeaId" = $1`, [FMEA_ID]);

if (existing.rows.length > 0) {
  console.log('Project already exists:', existing.rows[0]);
} else {
  // 2. TripletGroup
  const tgs = await pool.query(`SELECT id FROM triplet_groups LIMIT 1`);
  let tgId;
  if (tgs.rows.length > 0) {
    tgId = tgs.rows[0].id;
    console.log('Using existing TripletGroup:', tgId);
  } else {
    await pool.query(
      `INSERT INTO triplet_groups (id, subject, "productName") VALUES ($1, $2, $3)`,
      ['tg26-m004', 'Au Bump FC보강 검증', 'Au Bump']
    );
    tgId = 'tg26-m004';
    console.log('Created TripletGroup:', tgId);
  }

  // 3. FmeaProject
  await pool.query(
    `INSERT INTO fmea_projects (id, "fmeaId", "fmeaType", "tripletGroupId", status, step)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT ("fmeaId") DO NOTHING`,
    [FMEA_ID, FMEA_ID, 'PFMEA', tgId, 'ACTIVE', 'IMPORT']
  );
  console.log('Created FmeaProject:', FMEA_ID);

  // 4. FmeaRegistration
  await pool.query(
    `INSERT INTO fmea_registrations (id, "fmeaId", subject, "partName")
     VALUES ($1, $2, $3, $4) ON CONFLICT ("fmeaId") DO NOTHING`,
    ['reg-' + FMEA_ID, FMEA_ID, 'Au Bump FC보강 검증', 'Au Bump']
  );
  console.log('Created FmeaRegistration');
}

// 5. Project schema
const schemaExists = await pool.query(
  `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
  [SCHEMA_NAME]
);

if (schemaExists.rows.length > 0) {
  console.log('Schema exists:', SCHEMA_NAME);
} else {
  await pool.query(`CREATE SCHEMA "${SCHEMA_NAME}"`);
  console.log('Created schema:', SCHEMA_NAME);
}

// 6. Tables
const tables = [
  'l1_structures', 'l1_scopes', 'l1_requirements',
  'l2_structures', 'l3_structures',
  'l1_functions', 'l2_functions', 'l3_functions',
  'process_product_chars',
  'failure_effects', 'failure_modes', 'failure_causes',
  'failure_links', 'risk_analyses', 'optimizations',
  'fmea_legacy_data',
];

for (const tbl of tables) {
  const exists = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    [SCHEMA_NAME, tbl]
  );
  if (exists.rows.length === 0) {
    try {
      await pool.query(`CREATE TABLE "${SCHEMA_NAME}"."${tbl}" (LIKE public."${tbl}" INCLUDING ALL)`);
      console.log('  Created:', SCHEMA_NAME + '.' + tbl);
    } catch (e) {
      console.warn('  Skip:', tbl, '-', e.message.substring(0, 60));
    }
  } else {
    console.log('  Exists:', SCHEMA_NAME + '.' + tbl);
  }
}

// 7. Verify
const tableCount = await pool.query(
  `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = $1`,
  [SCHEMA_NAME]
);
console.log('\n=== Registration Complete ===');
console.log('fmeaId:', FMEA_ID);
console.log('schema:', SCHEMA_NAME);
console.log('tables:', tableCount.rows[0].cnt);

await pool.end();
