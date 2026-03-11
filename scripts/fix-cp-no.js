require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check current state
  const before = await pool.query('SELECT id, "cpNo", "fmeaId" FROM control_plans');
  console.log('Before:', JSON.stringify(before.rows, null, 2));

  // Update cpNo
  const result = await pool.query(
    `UPDATE control_plans SET "cpNo" = $1 WHERE "cpNo" = $2 RETURNING id, "cpNo", "fmeaId"`,
    ['cp26-m003-l03', 'CP-M26-001']
  );
  console.log('Updated:', JSON.stringify(result.rows, null, 2));

  // Verify
  const after = await pool.query('SELECT id, "cpNo", "fmeaId" FROM control_plans');
  console.log('After:', JSON.stringify(after.rows, null, 2));

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
