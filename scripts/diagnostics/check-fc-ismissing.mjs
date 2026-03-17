import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const SCHEMA = 'pfmea_pfm26_m059';
const keywords = ['클릭','추가','선택','입력','필요'];

async function main() {
  const fcs = await pool.query(`SELECT id, cause, "processCharId" FROM "${SCHEMA}".failure_causes`);
  console.log('Total FCs:', fcs.rows.length);
  
  let matchCount = 0;
  const matched = [];
  for (const fc of fcs.rows) {
    const name = (fc.cause || '').trim();
    if (!name || name === '-') {
      matchCount++;
      matched.push({ reason: 'EMPTY', id: fc.id, cause: fc.cause, pcId: fc.processCharId });
      continue;
    }
    if (name.length > 20) continue;
    for (const kw of keywords) {
      if (name.includes(kw)) {
        matchCount++;
        matched.push({ reason: `KEYWORD[${kw}]`, id: fc.id, cause: fc.cause, pcId: fc.processCharId });
        break;
      }
    }
  }

  console.log('\n=== isMissing 판정된 FC ===');
  for (const m of matched) {
    console.log(`  ${m.reason}: id=${m.id} cause="${m.cause}" pcId=${m.pcId}`);
  }
  console.log(`\nTotal isMissing: ${matchCount}`);

  // ProcessChar 중 FC가 연결되지 않은 것도 확인
  const pcs = await pool.query(`SELECT pc.id, pc.name, pc."l2StructId" FROM "${SCHEMA}".process_product_chars pc`);
  const fcByPcId = new Map();
  for (const fc of fcs.rows) {
    if (fc.processCharId) {
      if (!fcByPcId.has(fc.processCharId)) fcByPcId.set(fc.processCharId, []);
      fcByPcId.get(fc.processCharId).push(fc);
    }
  }
  
  let noFcCount = 0;
  console.log('\n=== FC가 없는 ProcessChar ===');
  for (const pc of pcs.rows) {
    const linkedFcs = fcByPcId.get(pc.id) || [];
    if (linkedFcs.length === 0) {
      noFcCount++;
      console.log(`  PC id=${pc.id} name="${pc.name}" l2Id=${pc.l2StructId}`);
    }
  }
  console.log(`\nFC 없는 ProcessChar: ${noFcCount}`);

  // Legacy data에서도 확인
  const legacy = await pool.query(`SELECT data FROM "${SCHEMA}".fmea_legacy_data WHERE "fmeaId" = 'pfm26-m059' LIMIT 1`);
  if (legacy.rows.length > 0) {
    const data = legacy.rows[0].data;
    let uiMissing = 0;
    const uiMissingList = [];
    for (const proc of (data.l2 || [])) {
      for (const we of (proc.l3 || [])) {
        for (const func of (we.functions || [])) {
          for (const pc of (func.processChars || [])) {
            const linkedFcs = (proc.failureCauses || []).filter(fc => fc.processCharId === pc.id);
            if (linkedFcs.length === 0) {
              uiMissing++;
              uiMissingList.push({ procNo: proc.no, procName: proc.name, weName: we.name, pcName: pc.name, pcId: pc.id });
            } else {
              for (const fc of linkedFcs) {
                const name = (fc.name || '').trim();
                if (!name || name === '-') { uiMissing++; uiMissingList.push({ procNo: proc.no, reason: 'EMPTY', fcName: fc.name, pcName: pc.name }); continue; }
                if (name.length > 20) continue;
                for (const kw of keywords) {
                  if (name.includes(kw)) {
                    uiMissing++;
                    uiMissingList.push({ procNo: proc.no, reason: `KW[${kw}]`, fcName: fc.name, pcName: pc.name, pcId: pc.id });
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
    console.log('\n=== Legacy 기반 UI missingCount 시뮬레이션 ===');
    for (const m of uiMissingList) {
      console.log(`  공정${m.procNo}: ${m.reason || 'NO_FC'} pc="${m.pcName}" fc="${m.fcName || ''}" pcId=${m.pcId || ''}`);
    }
    console.log(`\nUI missingCount 예상: ${uiMissing}`);
  }

  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
