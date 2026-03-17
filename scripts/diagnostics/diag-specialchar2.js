/**
 * 특별특성(specialChar) 상세 진단 — FlatItems + Prisma 스키마 확인
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

async function run() {
  const client = await pool.connect();
  try {
    // 최근 dataset
    const dsRes = await client.query(
      'SELECT id, "fmeaId" FROM pfmea_master_datasets ORDER BY "createdAt" DESC LIMIT 1'
    );
    if (dsRes.rows.length === 0) { console.log('No dataset'); return; }
    const dsId = dsRes.rows[0].id;
    const fmeaId = dsRes.rows[0].fmeaId;
    console.log('Dataset:', dsId, 'fmeaId:', fmeaId);

    // FlatItems 전체 분포
    const distRes = await client.query(
      'SELECT "itemCode", COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 GROUP BY "itemCode" ORDER BY "itemCode"',
      [dsId]
    );
    console.log('\n=== FlatItems itemCode 분포 ===');
    distRes.rows.forEach(r => console.log(' ', r.itemCode, ':', r.cnt, '건'));

    // FlatItems 테이블 컬럼 목록
    const colRes = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pfmea_master_flat_items' ORDER BY ordinal_position"
    );
    console.log('\n=== FlatItems 테이블 컬럼 ===');
    colRes.rows.forEach(r => console.log(' ', r.column_name, ':', r.data_type));

    // A4/B3 FlatItems specialChar
    const a4Res = await client.query(
      `SELECT "itemCode", "processNo", value, "specialChar"
       FROM pfmea_master_flat_items
       WHERE "datasetId" = $1 AND "itemCode" IN ('A4', 'B3')
       ORDER BY "processNo", "itemCode" LIMIT 10`,
      [dsId]
    );
    console.log('\n=== A4/B3 FlatItems 샘플 ===');
    a4Res.rows.forEach(r => {
      console.log(' ', r.itemCode, r.processNo, (r.value || '').substring(0, 25),
        'SC=' + (r.specialChar === null ? 'NULL' : r.specialChar === '' ? 'EMPTY' : '"' + r.specialChar + '"'));
    });

    // specialChar가 있는 항목 수
    const scRes = await client.query(
      `SELECT "itemCode", COUNT(*) as cnt
       FROM pfmea_master_flat_items
       WHERE "datasetId" = $1 AND "specialChar" IS NOT NULL AND "specialChar" != ''
       GROUP BY "itemCode"`,
      [dsId]
    );
    console.log('\n=== specialChar 존재 항목 ===');
    if (scRes.rows.length === 0) {
      console.log('  specialChar 있는 FlatItem: 0건');
    } else {
      scRes.rows.forEach(r => console.log(' ', r.itemCode, ':', r.cnt, '건'));
    }

    // L2Function atomic DB에서 specialChar 확인
    const l2fRes = await client.query(
      `SELECT id, "functionName", "productChar", "specialChar"
       FROM l2_functions
       WHERE "fmeaId" ILIKE $1
       ORDER BY "createdAt" LIMIT 10`,
      [fmeaId]
    );
    console.log('\n=== L2Functions atomic DB ===');
    console.log('총:', l2fRes.rows.length, '건 (최대10)');
    l2fRes.rows.forEach(r => {
      console.log('  func=' + (r.functionName || '').substring(0, 15),
        'pc=' + (r.productChar || '').substring(0, 15),
        'SC=' + (r.specialChar === null ? 'NULL' : r.specialChar === '' ? 'EMPTY' : '"' + r.specialChar + '"'));
    });

    // L3Function atomic DB에서 specialChar 확인
    const l3fRes = await client.query(
      `SELECT id, "functionName", "processChar", "specialChar"
       FROM l3_functions
       WHERE "fmeaId" ILIKE $1
       ORDER BY "createdAt" LIMIT 10`,
      [fmeaId]
    );
    console.log('\n=== L3Functions atomic DB ===');
    console.log('총:', l3fRes.rows.length, '건 (최대10)');
    l3fRes.rows.forEach(r => {
      console.log('  func=' + (r.functionName || '').substring(0, 15),
        'pc=' + (r.processChar || '').substring(0, 15),
        'SC=' + (r.specialChar === null ? 'NULL' : r.specialChar === '' ? 'EMPTY' : '"' + r.specialChar + '"'));
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
