/**
 * @file diag-fc-match.mjs
 * @description Diagnose why 103 ProcessChars show as "missing FC" in FailureL3Tab
 *
 * Checks both legacy JSON and atomic DB tables to find mismatches between
 * processChar IDs and FailureCause.processCharId linkage.
 */

import pg from 'pg';
const { Pool } = pg;

const FMEA_ID = 'pfm26-m056';
const SCHEMA = 'pfmea_' + FMEA_ID.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

console.log(`\n=== FC Match Diagnostic ===`);
console.log(`FMEA ID: ${FMEA_ID}`);
console.log(`Schema:  ${SCHEMA}\n`);

const pool = new Pool({
  connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db',
});

async function q(sql) {
  const res = await pool.query(sql);
  return res.rows;
}

async function main() {
  // ─── 1. Atomic DB tables ───
  console.log('══════════════════════════════════════════════');
  console.log('  PART A: Atomic DB Tables');
  console.log('══════════════════════════════════════════════\n');

  const l3Functions = await q(`SELECT id, "functionName", "l3StructId", "fmeaId" FROM ${SCHEMA}.l3_functions ORDER BY id`);
  const failureCauses = await q(`SELECT id, cause, "l3FuncId", "l3StructId", "l2StructId", "processCharId" FROM ${SCHEMA}.failure_causes ORDER BY id`);
  const l3Structures = await q(`SELECT id, name, "l2Id" FROM ${SCHEMA}.l3_structures ORDER BY id`);

  console.log(`L3Functions (atomic):     ${l3Functions.length}`);
  console.log(`FailureCauses (atomic):   ${failureCauses.length}`);
  console.log(`L3Structures (atomic):    ${l3Structures.length}`);

  // Build sets
  const l3FuncIds = new Set(l3Functions.map(r => r.id));
  const fcProcessCharIds = new Set(failureCauses.map(r => r.processCharId).filter(Boolean));
  const fcL3FuncIds = new Set(failureCauses.map(r => r.l3FuncId).filter(Boolean));

  // L3Functions NOT referenced by any FC's l3FuncId
  const l3FuncsNoFC = l3Functions.filter(f => !fcL3FuncIds.has(f.id));
  console.log(`\nL3Functions with NO linked FC (by l3_func_id): ${l3FuncsNoFC.length}`);
  if (l3FuncsNoFC.length > 0) {
    l3FuncsNoFC.slice(0, 10).forEach(f => console.log(`  - ${f.id} | functionName="${f.functionName}"`));
    if (l3FuncsNoFC.length > 10) console.log(`  ... and ${l3FuncsNoFC.length - 10} more`);
  }

  // L3Functions NOT referenced by any FC's processCharId
  const l3FuncsNoPCRef = l3Functions.filter(f => !fcProcessCharIds.has(f.id));
  console.log(`\nL3Functions with NO FC.processCharId match: ${l3FuncsNoPCRef.length}`);
  if (l3FuncsNoPCRef.length > 0) {
    l3FuncsNoPCRef.slice(0, 10).forEach(f => console.log(`  - ${f.id} | functionName="${f.functionName}"`));
    if (l3FuncsNoPCRef.length > 10) console.log(`  ... and ${l3FuncsNoPCRef.length - 10} more`);
  }

  // FCs with processCharId that doesn't match any L3Function
  const fcsOrphanPC = failureCauses.filter(fc => fc.processCharId && !l3FuncIds.has(fc.processCharId));
  console.log(`\nFCs with processCharId NOT in L3Functions: ${fcsOrphanPC.length}`);
  if (fcsOrphanPC.length > 0) {
    fcsOrphanPC.slice(0, 10).forEach(fc => console.log(`  - FC ${fc.id} | processCharId="${fc.processCharId}" | cause="${fc.cause?.substring(0, 40)}"`));
  }

  // FCs with NULL processCharId
  const fcsNullPC = failureCauses.filter(fc => !fc.processCharId);
  console.log(`\nFCs with NULL processCharId: ${fcsNullPC.length}`);

  // ─── 2. Legacy JSON ───
  console.log('\n══════════════════════════════════════════════');
  console.log('  PART B: Legacy JSON (FmeaLegacyData)');
  console.log('══════════════════════════════════════════════\n');

  const legacyRows = await q(`SELECT id, data FROM ${SCHEMA}.fmea_legacy_data WHERE "fmeaId" = '${FMEA_ID}' LIMIT 1`);
  if (legacyRows.length === 0) {
    console.log('ERROR: No FmeaLegacyData found for this FMEA ID');
    await pool.end();
    return;
  }

  const legacy = typeof legacyRows[0].data === 'string' ? JSON.parse(legacyRows[0].data) : legacyRows[0].data;
  const l2Array = legacy.l2 || [];

  console.log(`L2 processes in legacy: ${l2Array.length}`);

  let totalProcessChars = 0;
  let totalFCs = 0;
  let matchedChars = 0;
  let unmatchedChars = 0;
  const unmatchedCharList = [];
  let fcsWithBadPC = 0;
  const fcsWithBadPCList = [];

  // Also replicate the FailureL3Tab missingCount logic
  const isMeaningful = (name) => {
    if (!name) return false;
    const trimmed = String(name).trim();
    if (trimmed === '') return false;
    if (trimmed.length > 20) return true;
    const placeholders = ['클릭', '선택', '입력', '필요', '기능분석에서'];
    return !placeholders.some(p => trimmed.includes(p));
  };

  const isMissing = (name) => {
    if (!name) return true;
    const trimmed = String(name).trim();
    if (trimmed === '') return true;
    if (trimmed.length > 20) return false;
    const placeholders = ['클릭', '선택', '입력', '필요', '기능분석에서'];
    return placeholders.some(p => trimmed.includes(p));
  };

  let missingCountReplication = 0;

  // Collect ALL processChar IDs and ALL FC processCharIds
  const allPCIds = new Set();
  const allFCProcCharIds = new Set();

  l2Array.forEach((proc, pi) => {
    const allCauses = proc.failureCauses || [];
    const charIdsByName = new Map();

    (proc.l3 || []).forEach(we => {
      (we.functions || []).forEach(f => {
        (f.processChars || []).forEach(pc => {
          const n = String(pc.name || '').trim();
          const id = pc.id;
          totalProcessChars++;
          if (id) allPCIds.add(id);
          if (n && id) {
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
            charIdsByName.get(n).add(id);
          }
        });
      });
    });

    allCauses.forEach(fc => {
      totalFCs++;
      if (fc.processCharId) {
        allFCProcCharIds.add(fc.processCharId);
        if (allPCIds.has(fc.processCharId)) {
          // Will check after full scan
        }
      }
    });

    // ── Replicate missingCount logic ──
    if (!isMeaningful(proc.name)) return;

    const workElements = (proc.l3 || []).filter(we => isMeaningful(we.name));
    workElements.forEach(we => {
      const functions = we.functions || [];
      const hasMeaningfulFunc = functions.some(f => isMeaningful(f.name));
      let weHasAnyMeaningfulChar = false;

      functions.forEach(f => {
        const hasChars = (f.processChars || []).some(c => isMeaningful(c.name));
        if (!isMeaningful(f.name) && !hasChars) return;

        const displayedInFunc = new Set();
        (f.processChars || []).forEach(pc => {
          if (!isMeaningful(pc.name)) return;
          weHasAnyMeaningfulChar = true;

          const n = String(pc.name).trim();
          const idSet = charIdsByName.get(n);
          if (idSet && !displayedInFunc.has(n)) {
            displayedInFunc.add(n);
          }
        });

        displayedInFunc.forEach(n => {
          const idSet = charIdsByName.get(n);
          if (!idSet) return;
          const uniqueIds = [...idSet];
          const linkedCauses = uniqueIds.map(cid =>
            allCauses.filter(c => c.processCharId === cid)
          ).flat();

          const uniqueLinked = [];
          const seen = new Set();
          linkedCauses.forEach(c => {
            if (!seen.has(c.id)) { seen.add(c.id); uniqueLinked.push(c); }
          });

          if (uniqueLinked.length === 0) {
            missingCountReplication++;
          } else {
            uniqueLinked.forEach(c => {
              if (isMissing(c.name || c.cause)) missingCountReplication++;
            });
          }
        });
      });

      if (hasMeaningfulFunc && !weHasAnyMeaningfulChar) {
        missingCountReplication++;
      }
    });
  });

  // Now check cross-reference
  allPCIds.forEach(pcId => {
    const hasFCLink = allFCProcCharIds.has(pcId);
    if (hasFCLink) matchedChars++;
    else {
      unmatchedChars++;
      unmatchedCharList.push(pcId);
    }
  });

  // FCs referencing non-existent processChar
  allFCProcCharIds.forEach(fcPcId => {
    if (!allPCIds.has(fcPcId)) {
      fcsWithBadPC++;
      fcsWithBadPCList.push(fcPcId);
    }
  });

  console.log(`Total processChars in legacy:   ${totalProcessChars} (unique IDs: ${allPCIds.size})`);
  console.log(`Total FCs in legacy:            ${totalFCs}`);
  console.log(`Unique FC processCharIds:       ${allFCProcCharIds.size}`);
  console.log(`\nProcessChars WITH matching FC:   ${matchedChars}`);
  console.log(`ProcessChars WITHOUT matching FC: ${unmatchedChars}`);
  if (unmatchedCharList.length > 0) {
    console.log(`  First 10 unmatched processChar IDs:`);
    unmatchedCharList.slice(0, 10).forEach(id => console.log(`    - ${id}`));
    if (unmatchedCharList.length > 10) console.log(`    ... and ${unmatchedCharList.length - 10} more`);
  }

  console.log(`\nFCs with processCharId NOT in any processChar: ${fcsWithBadPC}`);
  if (fcsWithBadPCList.length > 0) {
    fcsWithBadPCList.slice(0, 10).forEach(id => console.log(`    - ${id}`));
  }

  // ── Replicated missingCount ──
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  PART C: Replicated missingCount Logic`);
  console.log(`══════════════════════════════════════════════\n`);
  console.log(`Replicated missingCount: ${missingCountReplication}`);

  // ── Detailed per-process breakdown ──
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  PART D: Per-Process Breakdown`);
  console.log(`══════════════════════════════════════════════\n`);

  l2Array.forEach((proc, pi) => {
    if (!isMeaningful(proc.name)) return;

    const allCauses = proc.failureCauses || [];
    const l3s = proc.l3 || [];
    let pcCount = 0;
    let fcCount = allCauses.length;
    let linkedCount = 0;
    let unlinkedCount = 0;

    const charIdsByName = new Map();
    l3s.forEach(we => {
      (we.functions || []).forEach(f => {
        (f.processChars || []).forEach(pc => {
          pcCount++;
          const n = String(pc.name || '').trim();
          const id = pc.id;
          if (n && id) {
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
            charIdsByName.get(n).add(id);
          }
        });
      });
    });

    // Count how many unique charNames have at least one FC
    let namesWithFC = 0;
    let namesWithoutFC = 0;
    charIdsByName.forEach((idSet, name) => {
      const hasFC = [...idSet].some(cid => allCauses.some(c => c.processCharId === cid));
      if (hasFC) namesWithFC++;
      else namesWithoutFC++;
    });

    // FC processCharIds that don't match any PC in this process
    const procPCIds = new Set();
    l3s.forEach(we => {
      (we.functions || []).forEach(f => {
        (f.processChars || []).forEach(pc => { if (pc.id) procPCIds.add(pc.id); });
      });
    });
    const orphanFCs = allCauses.filter(c => c.processCharId && !procPCIds.has(c.processCharId));

    console.log(`[${pi}] ${proc.name}`);
    console.log(`    PCs: ${pcCount} | FCs: ${fcCount} | charNames with FC: ${namesWithFC} | without FC: ${namesWithoutFC} | orphan FCs: ${orphanFCs.length}`);
    if (orphanFCs.length > 0) {
      orphanFCs.slice(0, 3).forEach(fc => {
        console.log(`      orphan FC: processCharId=${fc.processCharId} cause="${(fc.name || fc.cause || '').substring(0, 40)}"`);
      });
    }
  });

  // ── Part E: Check if FC.processCharId references processChars from DIFFERENT process ──
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  PART E: Cross-Process FC References`);
  console.log(`══════════════════════════════════════════════\n`);

  // Build global map: processCharId → which process index it belongs to
  const pcIdToProc = new Map();
  l2Array.forEach((proc, pi) => {
    (proc.l3 || []).forEach(we => {
      (we.functions || []).forEach(f => {
        (f.processChars || []).forEach(pc => {
          if (pc.id) pcIdToProc.set(pc.id, pi);
        });
      });
    });
  });

  let crossProcCount = 0;
  l2Array.forEach((proc, pi) => {
    (proc.failureCauses || []).forEach(fc => {
      if (fc.processCharId) {
        const ownerProc = pcIdToProc.get(fc.processCharId);
        if (ownerProc !== undefined && ownerProc !== pi) {
          crossProcCount++;
          if (crossProcCount <= 5) {
            console.log(`  FC in proc[${pi}] "${proc.name}" references PC from proc[${ownerProc}] "${l2Array[ownerProc]?.name}" | pcId=${fc.processCharId}`);
          }
        }
      }
    });
  });
  console.log(`Total cross-process FC references: ${crossProcCount}`);

  // ── Part F: Check FC "name"/"cause" field to understand isMissing FCs ──
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  PART F: FC cause text analysis`);
  console.log(`══════════════════════════════════════════════\n`);

  let fcWithMissingText = 0;
  let fcWithGoodText = 0;
  l2Array.forEach(proc => {
    (proc.failureCauses || []).forEach(fc => {
      const text = fc.name || fc.cause || '';
      if (isMissing(text)) fcWithMissingText++;
      else fcWithGoodText++;
    });
  });
  console.log(`FCs with "missing" text (placeholder/empty): ${fcWithMissingText}`);
  console.log(`FCs with real cause text: ${fcWithGoodText}`);

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
