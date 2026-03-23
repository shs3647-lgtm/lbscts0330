import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });

const schema = 'pfmea_pfm26_m005';
await pool.query(`SET search_path TO "${schema}", public`);

const { rows: l3f } = await pool.query(`SELECT id, "l3StructId", "l2StructId", "functionName", "processChar" FROM "${schema}".l3_functions ORDER BY "l2StructId", "l3StructId"`);
const { rows: fc }  = await pool.query(`SELECT id, "l3FuncId", "l3StructId", "l2StructId", "processCharId", cause FROM "${schema}".failure_causes`);
const { rows: l3s } = await pool.query(`SELECT id, "l2Id", m4, name FROM "${schema}".l3_structures ORDER BY "l2Id"`);
const { rows: l2s } = await pool.query(`SELECT id, no, name FROM "${schema}".l2_structures ORDER BY "order"`);

// How many unique l3FuncIds do FCs reference?
const uniqueFcL3FuncIds = new Set(fc.map(c => c.l3FuncId));
console.log(`Total L3F: ${l3f.length}, Total FC: ${fc.length}`);
console.log(`Unique l3FuncIds referenced by FCs: ${uniqueFcL3FuncIds.size}`);
console.log(`L3F with NO FC: ${l3f.length - uniqueFcL3FuncIds.size}`);

// Group FC by l2StructId (process)
const fcByL2 = new Map();
for (const c of fc) {
  if (!fcByL2.has(c.l2StructId)) fcByL2.set(c.l2StructId, []);
  fcByL2.get(c.l2StructId).push(c);
}

// Group L3F by l2StructId
const l3fByL2 = new Map();
for (const f of l3f) {
  if (!l3fByL2.has(f.l2StructId)) l3fByL2.set(f.l2StructId, []);
  l3fByL2.get(f.l2StructId).push(f);
}

// Per-process analysis
console.log('\nPer-process (L2):');
for (const l2 of l2s) {
  const procs = l3fByL2.get(l2.id) || [];
  const causes = fcByL2.get(l2.id) || [];
  const usedL3FIds = new Set(causes.map(c => c.l3FuncId));
  const withoutFC = procs.filter(f => !usedL3FIds.has(f.id));
  if (withoutFC.length > 0) {
    console.log(`  ${l2.no} ${l2.name}: L3F=${procs.length} FC=${causes.length} missing=${withoutFC.length}`);
    withoutFC.slice(0, 3).forEach(f => {
      console.log(`    B3 no FC: id=${f.id.substring(0,20)}... name="${f.processChar?.substring(0,25)}"`);
    });
  }
}

// Show FC distribution: how many FCs per B3
const fcCountPerB3 = new Map();
for (const f of l3f) fcCountPerB3.set(f.id, 0);
for (const c of fc) {
  const cur = fcCountPerB3.get(c.l3FuncId) || 0;
  fcCountPerB3.set(c.l3FuncId, cur + 1);
}
const dist = {};
for (const [, cnt] of fcCountPerB3) {
  dist[cnt] = (dist[cnt] || 0) + 1;
}
console.log('\nFC count distribution per B3:', dist);

await pool.end();
