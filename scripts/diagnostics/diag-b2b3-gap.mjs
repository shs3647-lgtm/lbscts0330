/**
 * diag-b2b3-gap.mjs
 *
 * B2/B3 Import vs DB gap 진단 스크립트
 * - Import (PfmeaMasterFlatItem): itemCode='B2' value, itemCode='B3' value
 * - DB (L3Function): functionName (B2 대응), processChar (B3 대응)
 *
 * Usage: node scripts/diag-b2b3-gap.mjs
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('=== B2/B3 Import vs DB Gap Diagnostic ===\n');

  // 1. Find active PfmeaMasterDataset
  const dsResult = await client.query(`
    SELECT id, name, "fmeaId", "fmeaType", "isActive"
    FROM pfmea_master_datasets
    WHERE "isActive" = true
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);

  if (dsResult.rows.length === 0) {
    console.log('ERROR: No active PfmeaMasterDataset found!');
    await client.end();
    return;
  }

  console.log(`Found ${dsResult.rows.length} active dataset(s):`);
  for (const ds of dsResult.rows) {
    console.log(`  - id=${ds.id.slice(0,8)}... name="${ds.name}" fmeaId="${ds.fmeaId}" type=${ds.fmeaType}`);
  }

  // Use the first active dataset
  const dataset = dsResult.rows[0];
  const datasetId = dataset.id;
  const fmeaId = dataset.fmeaId;
  console.log(`\nUsing dataset: "${dataset.name}" (fmeaId=${fmeaId})\n`);

  // ============================================================
  // B2 Analysis: Import B2 values vs DB L3Function.functionName
  // ============================================================
  console.log('=' .repeat(60));
  console.log('  B2 Analysis: Import(value) vs DB(L3Function.functionName)');
  console.log('=' .repeat(60));

  // Import B2 distinct values
  const importB2 = await client.query(`
    SELECT DISTINCT value
    FROM pfmea_master_flat_items
    WHERE "datasetId" = $1
      AND "itemCode" = 'B2'
      AND value != ''
    ORDER BY value
  `, [datasetId]);

  // DB L3Function distinct functionName
  const dbB2 = await client.query(`
    SELECT DISTINCT "functionName"
    FROM l3_functions
    WHERE "fmeaId" = $1
      AND "functionName" != ''
    ORDER BY "functionName"
  `, [fmeaId]);

  const importB2Set = new Set(importB2.rows.map(r => r.value.trim()));
  const dbB2Set = new Set(dbB2.rows.map(r => r.functionName.trim()));

  console.log(`\n  Import B2 DISTINCT count: ${importB2Set.size}`);
  console.log(`  DB functionName DISTINCT count: ${dbB2Set.size}`);

  const b2InImportNotDb = [...importB2Set].filter(v => !dbB2Set.has(v));
  const b2InDbNotImport = [...dbB2Set].filter(v => !importB2Set.has(v));

  console.log(`\n  B2 in Import but NOT in DB: ${b2InImportNotDb.length}`);
  if (b2InImportNotDb.length > 0) {
    for (const v of b2InImportNotDb) {
      console.log(`    MISSING IN DB: "${v}"`);
    }
  } else {
    console.log('    (none - all Import B2 values exist in DB)');
  }

  console.log(`\n  B2 in DB but NOT in Import: ${b2InDbNotImport.length}`);
  if (b2InDbNotImport.length > 0) {
    for (const v of b2InDbNotImport) {
      console.log(`    EXTRA IN DB: "${v}"`);
    }
  } else {
    console.log('    (none - all DB functionNames exist in Import)');
  }

  // Show all Import B2 values for reference
  console.log(`\n  --- All Import B2 values (${importB2Set.size}) ---`);
  let idx = 1;
  for (const v of importB2Set) {
    const inDb = dbB2Set.has(v) ? 'OK' : 'MISSING';
    console.log(`    ${String(idx).padStart(3)}. "${v}" [${inDb}]`);
    idx++;
  }

  // ============================================================
  // B3 Analysis: Import B3 values vs DB L3Function.processChar
  // ============================================================
  console.log('\n' + '=' .repeat(60));
  console.log('  B3 Analysis: Import(value) vs DB(L3Function.processChar)');
  console.log('=' .repeat(60));

  // Import B3 distinct values
  const importB3 = await client.query(`
    SELECT DISTINCT value
    FROM pfmea_master_flat_items
    WHERE "datasetId" = $1
      AND "itemCode" = 'B3'
      AND value != ''
    ORDER BY value
  `, [datasetId]);

  // DB L3Function distinct processChar
  const dbB3 = await client.query(`
    SELECT DISTINCT "processChar"
    FROM l3_functions
    WHERE "fmeaId" = $1
      AND "processChar" != ''
    ORDER BY "processChar"
  `, [fmeaId]);

  const importB3Set = new Set(importB3.rows.map(r => r.value.trim()));
  const dbB3Set = new Set(dbB3.rows.map(r => r.processChar.trim()));

  console.log(`\n  Import B3 DISTINCT count: ${importB3Set.size}`);
  console.log(`  DB processChar DISTINCT count: ${dbB3Set.size}`);

  const b3InImportNotDb = [...importB3Set].filter(v => !dbB3Set.has(v));
  const b3InDbNotImport = [...dbB3Set].filter(v => !importB3Set.has(v));

  console.log(`\n  B3 in Import but NOT in DB: ${b3InImportNotDb.length}`);
  if (b3InImportNotDb.length > 0) {
    for (const v of b3InImportNotDb) {
      console.log(`    MISSING IN DB: "${v}"`);
    }
  } else {
    console.log('    (none - all Import B3 values exist in DB)');
  }

  console.log(`\n  B3 in DB but NOT in Import: ${b3InDbNotImport.length}`);
  if (b3InDbNotImport.length > 0) {
    for (const v of b3InDbNotImport) {
      console.log(`    EXTRA IN DB: "${v}"`);
    }
  } else {
    console.log('    (none - all DB processChars exist in Import)');
  }

  // Show all Import B3 values for reference
  console.log(`\n  --- All Import B3 values (${importB3Set.size}) ---`);
  idx = 1;
  for (const v of importB3Set) {
    const inDb = dbB3Set.has(v) ? 'OK' : 'MISSING';
    console.log(`    ${String(idx).padStart(3)}. "${v}" [${inDb}]`);
    idx++;
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n' + '=' .repeat(60));
  console.log('  SUMMARY');
  console.log('=' .repeat(60));
  console.log(`  B2: Import=${importB2Set.size}, DB=${dbB2Set.size}, Gap(Import-DB)=${b2InImportNotDb.length}, Gap(DB-Import)=${b2InDbNotImport.length}`);
  console.log(`  B3: Import=${importB3Set.size}, DB=${dbB3Set.size}, Gap(Import-DB)=${b3InImportNotDb.length}, Gap(DB-Import)=${b3InDbNotImport.length}`);

  if (b2InImportNotDb.length === 0 && b3InImportNotDb.length === 0) {
    console.log('\n  RESULT: ALL CLEAR - No gaps found. All Import B2/B3 values exist in DB.');
  } else {
    console.log(`\n  RESULT: GAPS FOUND - ${b2InImportNotDb.length + b3InImportNotDb.length} value(s) in Import but missing from DB.`);
  }

  await client.end();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
