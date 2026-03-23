import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });

const fmeaId = 'pfm26-m066';
const schema = 'pfmea_pfm26_m066';

await pool.query(`SET search_path TO ${schema}, public`);

const { rows: l3f } = await pool.query(`SELECT id, "fmeaId", "l3StructId", "l2StructId", "functionName", "processChar" FROM l3_functions WHERE "fmeaId" = $1`, [fmeaId]);
const { rows: fc }  = await pool.query(`SELECT id, "fmeaId", "l3FuncId", "l3StructId", "l2StructId", "processCharId", cause FROM failure_causes WHERE "fmeaId" = $1`, [fmeaId]);
const { rows: l3s } = await pool.query(`SELECT id, "fmeaId", "l2Id" FROM l3_structures WHERE "fmeaId" = $1`, [fmeaId]);
const { rows: l2s } = await pool.query(`SELECT id, "fmeaId", no, name FROM l2_structures WHERE "fmeaId" = $1`, [fmeaId]);

const l3ToL2 = new Map(l3s.map(s => [s.id, s.l2Id]));
const l3fMap = new Map(l3f.map(f => [f.id, f]));
const l3fIdSet = new Set(l3f.map(f => f.id));
const l2IdSet = new Set(l2s.map(s => s.id));

let ok = 0, l3fMissing = 0, l2Mismatch = 0, structL2Mismatch = 0;
const mismatchSamples = [];

for (const c of fc) {
  if (!l3fIdSet.has(c.l3FuncId)) { l3fMissing++; continue; }
  const func = l3fMap.get(c.l3FuncId);
  if (func.l2StructId !== c.l2StructId) l2Mismatch++;
  const actualL2 = l3ToL2.get(func.l3StructId);
  if (actualL2 !== c.l2StructId) {
    structL2Mismatch++;
    if (mismatchSamples.length < 5) {
      mismatchSamples.push({
        fcId: c.id,
        cause: c.cause?.substring(0, 20),
        fcL2: c.l2StructId,
        funcL2: func.l2StructId,
        structL2: actualL2,
        l3FuncId: c.l3FuncId,
      });
    }
  }
  ok++;
}

// Check how many B3 (pc.id = L3Function.id) have no FC matching
const pcIdToFcCount = new Map();
for (const f of l3f) {
  pcIdToFcCount.set(f.id, 0);
}
for (const c of fc) {
  const pcId = c.l3FuncId; // After save, processCharId should = l3FuncId
  if (pcIdToFcCount.has(pcId)) {
    pcIdToFcCount.set(pcId, pcIdToFcCount.get(pcId) + 1);
  }
}
const b3WithNoFc = [...pcIdToFcCount.entries()].filter(([, cnt]) => cnt === 0);

// Also check DB processCharId
const pcIdDbToFcCount = new Map();
for (const f of l3f) {
  pcIdDbToFcCount.set(f.id, 0);
}
for (const c of fc) {
  const pcId = c.processCharId;
  if (pcId && pcIdDbToFcCount.has(pcId)) {
    pcIdDbToFcCount.set(pcId, pcIdDbToFcCount.get(pcId) + 1);
  }
}
const b3WithNoFcByDbPcId = [...pcIdDbToFcCount.entries()].filter(([, cnt]) => cnt === 0);

console.log(JSON.stringify({
  totalFC: fc.length,
  totalL3F: l3f.length,
  totalL3S: l3s.length,
  totalL2S: l2s.length,
  fcOk: ok,
  fcL3FuncMissing: l3fMissing,
  fcL2Mismatch_funcL2: l2Mismatch,
  fcL2Mismatch_structL2: structL2Mismatch,
  mismatchSamples,
  b3WithNoFc_byL3FuncId: b3WithNoFc.length,
  b3WithNoFc_byDbPcId: b3WithNoFcByDbPcId.length,
  b3Total: l3f.length,
  fcSample_processCharId: fc.slice(0, 3).map(c => ({
    id: c.id,
    l3FuncId: c.l3FuncId,
    processCharId: c.processCharId,
    match: c.processCharId === c.l3FuncId,
  })),
}, null, 2));

await pool.end();
