import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const SCHEMA = 'pfmea_pfm26_m059';

const isMeaningful = (name) => {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  if (n.includes('클릭하여')) return false;
  if (n === '요구사항 선택') return false;
  if (n.startsWith('(기능분석에서')) return false;
  return true;
};

const isMissing = (name) => {
  if (name === null || name === undefined) return true;
  if (!name) return true;
  const str = String(name);
  const trimmed = str.trim();
  if (trimmed === '' || trimmed === '-') return true;
  if (trimmed.length > 20) return false;
  if (str.includes('클릭')) return true;
  if (str.includes('추가')) return true;
  if (str.includes('선택')) return true;
  if (str.includes('입력')) return true;
  if (str.includes('필요')) return true;
  return false;
};

async function main() {
  const l2Structs = await pool.query(`SELECT id, no, name, "order" FROM "${SCHEMA}".l2_structures ORDER BY "order"`);
  const l3Structs = await pool.query(`SELECT id, "l2Id", m4, name, "order" FROM "${SCHEMA}".l3_structures ORDER BY "order"`);
  const l3Funcs = await pool.query(`SELECT id, "l3StructId", "l2StructId", "functionName", "processChar", "specialChar" FROM "${SCHEMA}".l3_functions`);
  const fcs = await pool.query(`SELECT id, cause, "processCharId", "l2StructId", occurrence FROM "${SCHEMA}".failure_causes`);

  // Build atomicToLegacy-equivalent structure
  const l3sByL2 = new Map();
  for (const l3 of l3Structs.rows) {
    if (!l3sByL2.has(l3.l2Id)) l3sByL2.set(l3.l2Id, []);
    l3sByL2.get(l3.l2Id).push(l3);
  }

  const l3FuncsByL3 = new Map();
  for (const f of l3Funcs.rows) {
    if (!l3FuncsByL3.has(f.l3StructId)) l3FuncsByL3.set(f.l3StructId, []);
    l3FuncsByL3.get(f.l3StructId).push(f);
  }

  const fcsByL2 = new Map();
  for (const fc of fcs.rows) {
    if (!fcsByL2.has(fc.l2StructId)) fcsByL2.set(fc.l2StructId, []);
    fcsByL2.get(fc.l2StructId).push(fc);
  }

  // Build legacy-like structure per L2
  let totalMissing = 0;
  const missingDetails = [];

  for (const l2 of l2Structs.rows) {
    if (!isMeaningful(l2.name)) continue;

    // Build processChars from L3Functions (same as buildL3Functions)
    const l3s = l3sByL2.get(l2.id) || [];
    const allFCs = (fcsByL2.get(l2.id) || []).map(fc => ({
      id: fc.id,
      name: fc.cause,
      processCharId: fc.processCharId || '',
      occurrence: fc.occurrence,
    }));

    // Build charIdsByName (same as FailureL3Tab line 118-129)
    const charIdsByName = new Map();
    for (const l3 of l3s) {
      const funcsForL3 = l3FuncsByL3.get(l3.id) || [];
      // Group by functionName (same as buildL3Functions)
      const funcGroups = new Map();
      for (const f of funcsForL3) {
        if (!funcGroups.has(f.functionName)) funcGroups.set(f.functionName, []);
        funcGroups.get(f.functionName).push(f);
      }
      
      for (const [funcName, funcs] of funcGroups) {
        for (const f of funcs) {
          // processChars[].id = f.id, processChars[].name = f.processChar
          const n = String(f.processChar || '').trim();
          const id = String(f.id || '').trim();
          if (!n || !id) continue;
          if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
          charIdsByName.get(n).add(id);
        }
      }
    }

    // Count missing per work element (same as FailureL3Tab line 131-176)
    const workElements = l3s.filter(we => isMeaningful(we.name));
    for (const we of workElements) {
      const funcsForWe = l3FuncsByL3.get(we.id) || [];
      const funcGroups = new Map();
      for (const f of funcsForWe) {
        if (!funcGroups.has(f.functionName)) funcGroups.set(f.functionName, []);
        funcGroups.get(f.functionName).push(f);
      }

      const hasMeaningfulFunc = [...funcGroups.keys()].some(fn => isMeaningful(fn));
      let weHasAnyMeaningfulChar = false;

      for (const [funcName, funcs] of funcGroups) {
        const processChars = funcs.map(f => ({ id: f.id, name: f.processChar }));
        const hasChars = processChars.some(c => isMeaningful(c.name));
        if (!isMeaningful(funcName) && !hasChars) continue;

        const displayedInFunc = new Set();
        for (const pc of processChars) {
          if (!isMeaningful(pc.name)) continue;
          weHasAnyMeaningfulChar = true;
          const charName = String(pc.name || '').trim();
          if (displayedInFunc.has(charName)) continue;
          displayedInFunc.add(charName);

          const ids = charIdsByName.get(charName) || new Set([String(pc.id)]);
          const linked = allFCs.filter(c => ids.has(String(c.processCharId || '').trim()));
          const seenNames = new Set();
          const uniqueLinked = linked.filter(c => {
            const n = String(c?.name || '').trim();
            if (!n) return true;
            if (seenNames.has(n)) return false;
            seenNames.add(n);
            return true;
          });

          if (uniqueLinked.length === 0) {
            totalMissing++;
            missingDetails.push({
              type: 'NO_FC',
              proc: `${l2.no}(${l2.name})`,
              we: we.name,
              pcName: charName,
              pcIds: [...ids].join(','),
            });
          } else {
            for (const c of uniqueLinked) {
              if (isMissing(c.name)) {
                totalMissing++;
                missingDetails.push({
                  type: 'PLACEHOLDER',
                  proc: `${l2.no}(${l2.name})`,
                  we: we.name,
                  pcName: charName,
                  fcName: c.name,
                });
              }
            }
          }
        }
      }

      if (hasMeaningfulFunc && !weHasAnyMeaningfulChar) {
        totalMissing++;
        missingDetails.push({
          type: 'NO_PC',
          proc: `${l2.no}(${l2.name})`,
          we: we.name,
        });
      }
    }
  }

  console.log(`=== UI missingCount 시뮬레이션 (Atomic DB 기반) ===`);
  console.log(`Total Missing: ${totalMissing}\n`);
  for (const d of missingDetails) {
    if (d.type === 'NO_FC') {
      console.log(`  ❌ NO_FC: 공정${d.proc} → WE="${d.we}" → PC="${d.pcName}" (ids: ${d.pcIds})`);
    } else if (d.type === 'PLACEHOLDER') {
      console.log(`  ⚠️ PLACEHOLDER: 공정${d.proc} → WE="${d.we}" → PC="${d.pcName}" → FC="${d.fcName}"`);
    } else {
      console.log(`  🔶 NO_PC: 공정${d.proc} → WE="${d.we}"`);
    }
  }

  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
