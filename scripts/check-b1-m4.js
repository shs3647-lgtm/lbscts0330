/**
 * B1 항목의 m4 값 확인 스크립트
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    // B1 items with m4
    const b1 = await client.query(
      `SELECT "processNo", "value", "m4" FROM "pfmea_master_flat_items" WHERE "itemCode" = 'B1' ORDER BY "processNo"`
    );
    console.log('=== B1 items with m4 ===');
    b1.rows.forEach(i => console.log(`${i.processNo} | ${i.value} | m4=${i.m4 || 'NULL'}`));
    console.log(`Total B1: ${b1.rows.length}`);

    // Total counts
    const total = await client.query(`SELECT COUNT(*) as cnt FROM "pfmea_master_flat_items"`);
    console.log(`\nTotal items: ${total.rows[0].cnt}`);

    // Dataset info
    const ds = await client.query(`SELECT id, name, "isActive" FROM "pfmea_master_datasets" ORDER BY "updatedAt" DESC`);
    console.log('\n=== Datasets ===');
    ds.rows.forEach(r => console.log(`${r.id} | ${r.name} | active=${r.isActive}`));

    // itemCode distribution
    const dist = await client.query(
      `SELECT "itemCode", COUNT(*) as cnt FROM "pfmea_master_flat_items" GROUP BY "itemCode" ORDER BY "itemCode"`
    );
    console.log('\n=== ItemCode Distribution ===');
    dist.rows.forEach(c => console.log(`${c.itemCode}: ${c.cnt}`));

  } finally {
    client.release();
    await pool.end();
  }
}

check();
