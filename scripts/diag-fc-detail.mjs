import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });

// Check ALL schemas that have data
const activeSchemas = [
  'pfmea_pfm26_m001', 'pfmea_pfm26_m002', 'pfmea_pfm26_m003',
  'pfmea_pfm26_m004', 'pfmea_pfm26_m005', 'pfmea_pfm26_m102',
  'pfmea_pfm26_f001',
];

for (const schema of activeSchemas) {
  console.log(`\n=== ${schema} ===`);
  await pool.query(`SET search_path TO "${schema}", public`);

  const { rows: l3f } = await pool.query(`SELECT id, "l3StructId", "l2StructId", "functionName", "processChar" FROM "${schema}".l3_functions LIMIT 500`);
  const { rows: fc }  = await pool.query(`SELECT id, "l3FuncId", "l3StructId", "l2StructId", "processCharId", cause FROM "${schema}".failure_causes LIMIT 500`);
  const { rows: l3s } = await pool.query(`SELECT id, "l2Id" FROM "${schema}".l3_structures LIMIT 500`);

  const l3ToL2 = new Map(l3s.map(s => [s.id, s.l2Id]));
  const l3fMap = new Map(l3f.map(f => [f.id, f]));
  const l3fIdSet = new Set(l3f.map(f => f.id));

  // B3 with no FC (by l3FuncId)
  const pcIdToFcCount = new Map();
  for (const f of l3f) pcIdToFcCount.set(f.id, 0);
  for (const c of fc) {
    if (pcIdToFcCount.has(c.l3FuncId)) pcIdToFcCount.set(c.l3FuncId, pcIdToFcCount.get(c.l3FuncId) + 1);
  }
  const b3WithNoFc = [...pcIdToFcCount.entries()].filter(([, cnt]) => cnt === 0).length;

  // FC with l3FuncId not in L3Function set
  let fcOrphan = 0;
  let fcPcIdMismatch = 0;
  for (const c of fc) {
    if (!l3fIdSet.has(c.l3FuncId)) fcOrphan++;
    if (c.processCharId !== c.l3FuncId) fcPcIdMismatch++;
  }

  // l3Func l2StructId vs l3Struct.l2Id mismatch  
  let l3fL2Mismatch = 0;
  for (const f of l3f) {
    const actualL2 = l3ToL2.get(f.l3StructId);
    if (actualL2 && actualL2 !== f.l2StructId) l3fL2Mismatch++;
  }

  console.log(`  L3F=${l3f.length} FC=${fc.length} L3S=${l3s.length}`);
  console.log(`  B3 with no FC: ${b3WithNoFc}`);
  console.log(`  FC orphan (l3FuncId not in L3F): ${fcOrphan}`);
  console.log(`  FC processCharId != l3FuncId: ${fcPcIdMismatch}`);
  console.log(`  L3F l2StructId mismatch with L3Struct.l2Id: ${l3fL2Mismatch}`);

  // Check legacy data in project schema
  try {
    const { rows: leg } = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".fmea_legacy_data`);
    console.log(`  fmea_legacy_data: ${leg[0].cnt}`);
  } catch(e) { console.log(`  fmea_legacy_data: N/A`); }
}

await pool.end();
