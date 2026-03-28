import pg from 'pg';
const client = new pg.Client({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
await client.connect();

for (const schema of ['pfmea_pfm26_m002', 'pfmea_pfm26_m081']) {
  console.log(`\n=== ${schema} ===`);
  const fms = await client.query(`SELECT id, mode, "l2StructId" FROM "${schema}".failure_modes`);
  const fls = await client.query(`SELECT DISTINCT "fmId" FROM "${schema}".failure_links`);
  const linkedFmIds = new Set(fls.rows.map(r => r.fmId));
  
  const l2cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'l2_structures' ORDER BY ordinal_position`);
  console.log('L2 columns:', l2cols.rows.map(r => r.column_name).join(', '));
  const l2s = await client.query(`SELECT id, name, "order" FROM "${schema}".l2_structures`);
  const l2Map = new Map(l2s.rows.map(r => [r.id, r]));

  const fcs = await client.query(`SELECT id, cause, "l2StructId" FROM "${schema}".failure_causes`);
  
  const unlinked = fms.rows.filter(fm => !linkedFmIds.has(fm.id));
  console.log(`Total FM: ${fms.rows.length}, Linked: ${linkedFmIds.size}, Unlinked: ${unlinked.length}`);
  
  for (const fm of unlinked) {
    const l2 = l2Map.get(fm.l2StructId);
    console.log(`  FM: ${fm.id}`);
    console.log(`    mode: ${fm.mode}`);
    console.log(`    process: ${l2 ? l2.order + ' ' + l2.name : fm.l2StructId}`);
    
    // Find FCs in same process
    const procFcs = fcs.rows.filter(fc => fc.l2StructId === fm.l2StructId);
    console.log(`    FCs in same process: ${procFcs.length}`);
    
    // Check if any FL links this FM to any FC
    const fmFls = await client.query(
      `SELECT id, "fcId", "feId" FROM "${schema}".failure_links WHERE "fmId" = $1`, [fm.id]
    );
    console.log(`    FLs for this FM: ${fmFls.rows.length}`);
  }
}

await client.end();
